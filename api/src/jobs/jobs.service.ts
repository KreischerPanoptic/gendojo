import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import { PathsConfig } from '../config/paths.config';
import { SettingsService } from '../system/settings/settings.service';
import { TomlService } from '../toml/toml.service';
import { DatasetsService } from '../datasets/datasets.service';
import { validateTrainConfig } from '../utils/toml';

import type { DatasetTomlDto } from '../toml/dto/dataset-toml.dto';
import {
  JobStatus,
  TrainingJob,
  JobSummary,
  JobDetail,
  CreateJobDto,
  DatasetRefOptions,
  LogLine,
  LogStream,
  JobLogEvent,
  JobStatusEvent,
} from './entities/jobs.types';

@Injectable()
export class JobsService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);

  private readonly jobs      = new Map<string, TrainingJob>();
  private readonly processes = new Map<string, ChildProcess>();

  constructor(
    private readonly paths:    PathsConfig,
    private readonly settings: SettingsService,
    private readonly toml:     TomlService,
    private readonly datasets: DatasetsService,
  ) {
    super();
    this.setMaxListeners(100);
  }

  // ── Dynamic settings ───────────────────────────────────────────────────────

  private get maxConcurrentJobs():   number { return this.settings.getTraining().maxConcurrentJobs;   }
  private get logBufferSize():       number { return this.settings.getTraining().logBufferSize;       }
  private get cpuThreadsPerProcess(): string { return String(this.settings.getTraining().cpuThreadsPerProcess); }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Module destroying — sending SIGTERM to all running processes');
    for (const [jobId, proc] of this.processes) {
      this.logger.log(`Terminating job ${jobId} (PID ${proc.pid})`);
      proc.kill('SIGTERM');
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async create(dto: CreateJobDto): Promise<JobDetail> {
    // 1. Resolve dataset — either from ref or full DTO
    const { datasetDto, datasetName } = await this.resolveDataset(dto);

    // 2. Enforce concurrency cap (cheap check, before any I/O)
    const running = [...this.jobs.values()].filter(j => j.status === JobStatus.Running);
    if (running.length >= this.maxConcurrentJobs) {
      throw Object.assign(
        new Error(`Maximum concurrent jobs (${this.maxConcurrentJobs}) already running`),
        { statusCode: 409 },
      );
    }

    // 3. Generate job ID and compute all paths up-front.
    //    jobId is just a UUID — no I/O needed here.
    const jobId           = randomUUID();
    const jobDir          = this.paths.jobDir(jobId);
    const jobTempDir      = this.paths.jobTempDir(jobId);
    // TOML files live alongside the log in jobDir — one directory for all job artifacts
    const datasetTomlPath = path.join(jobDir, 'dataset.toml');
    const trainTomlPath   = path.join(jobDir, 'train.toml');
    const logFilePath     = path.join(jobDir, 'train.log');

    // 4. Build enriched train DTO with runtime-injected fields.
    //    output_dir defaults to <outputs>/<output_name> so each run gets its own subfolder.
    //    dataset_config is required by the validator — inject before validation.
    const outputName = dto.train.output_name || 'untitled';
    const trainDto = {
      ...dto.train,
      output_dir:     dto.train.output_dir || path.join(this.paths.outputs, outputName),
      dataset_config: datasetTomlPath,
    };

    // 5. Validate enriched train config (both output_dir and dataset_config are now present)
    const validation = validateTrainConfig(trainDto);
    if (!validation.valid) {
      const messages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw Object.assign(
        new Error(`Train config validation failed — ${messages}`),
        { statusCode: 422, validation },
      );
    }

    // 6. Create job directory (only after validation passes — no orphaned dirs on 422)
    //    All job artifacts (TOMLs + log) live in jobDir together.
    await fs.mkdir(jobDir, { recursive: true });

    // 7. Resolve training script
    const script     = this.toml.getTrainScript(dto.train.arch);
    const scriptPath = path.join(this.paths.sdScripts, script);

    // 8. Generate and write TOML files
    const datasetTomlContent = this.toml.generateDatasetToml(datasetDto);
    const trainTomlContent   = this.toml.generateTrainToml(trainDto);

    await fs.writeFile(datasetTomlPath, datasetTomlContent, 'utf8');
    await fs.writeFile(trainTomlPath,   trainTomlContent,   'utf8');

    this.logger.log(`Job ${jobId}: dataset.toml → ${datasetTomlPath}`);
    this.logger.log(`Job ${jobId}: train.toml   → ${trainTomlPath}`);

    // 9. Build display command string
    const command = [
      'accelerate', 'launch',
      '--config_file', this.paths.accelerateConfig,
      '--num_cpu_threads_per_process', this.cpuThreadsPerProcess,
      scriptPath,
      '--config_file', trainTomlPath,
    ].join(' ');

    // 10. Register job record
    const job: TrainingJob = {
      id: jobId,
      name: dto.train.output_name,
      arch: dto.train.arch,
      datasetName,
      jobDir,
      datasetTomlPath,
      trainTomlPath,
      logFilePath,
      script,
      command,
      status: JobStatus.Pending,
      logBuffer: [],
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    this.launch(job);

    return this.toDetail(job);
  }

  list(): JobSummary[] {
    return [...this.jobs.values()].map(j => this.toSummary(j));
  }

  getById(id: string): JobDetail | undefined {
    const job = this.jobs.get(id);
    return job ? this.toDetail(job) : undefined;
  }

  getLogs(id: string): LogLine[] | undefined {
    return this.jobs.get(id)?.logBuffer;
  }

  async kill(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status !== JobStatus.Running) return false;

    const proc = this.processes.get(id);
    if (!proc) return false;

    this.logger.log(`Killing job ${id} (PID ${proc.pid})`);
    proc.kill('SIGTERM');

    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    if (this.processes.has(id)) {
      proc.kill('SIGKILL');
    }

    return true;
  }

  // ── Dataset resolution ────────────────────────────────────────────────────

  /**
   * Resolve CreateJobDto to a concrete DatasetTomlDto.
   *
   * Mode 1 — datasetRef:
   *   - Fetch dataset detail from DatasetsService (throws 404 if missing)
   *   - Assert imageCount > 0 (throw 422 if empty)
   *   - Warn (log) if captionCoverage < 1.0 so the user knows some images
   *     will use class_tokens fallback
   *   - Build a minimal but complete DatasetTomlDto
   *
   * Mode 2 — full dataset DTO:
   *   - Pass through unchanged; caller is responsible for correct paths
   */
  private async resolveDataset(dto: CreateJobDto): Promise<{
    datasetDto: DatasetTomlDto;
    datasetName: string | undefined;
  }> {
    // ── Mode 2: full DTO provided ────────────────────────────────────────────
    if (dto.dataset) {
      return { datasetDto: dto.dataset, datasetName: undefined };
    }

    // ── Mode 1: datasetRef ───────────────────────────────────────────────────
    const { datasetRef, datasetOptions = {} } = dto;

    // Throws NotFoundException (wrapped to 422 below) if the directory is missing
    let detail: Awaited<ReturnType<DatasetsService['getOne']>>;
    try {
      detail = await this.datasets.getOne(datasetRef);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 404) {
        throw Object.assign(
          new Error(`Dataset "${datasetRef}" not found. Upload it first via POST /datasets/upload/zip`),
          { statusCode: 422 },
        );
      }
      throw err;
    }

    if (detail.imageCount === 0) {
      throw Object.assign(
        new Error(
          `Dataset "${datasetRef}" exists but contains no supported images. ` +
          `Supported formats: jpg, jpeg, png, webp`,
        ),
        { statusCode: 422 },
      );
    }

    if (detail.captionCoverage < 1.0) {
      const uncaptioned = detail.imageCount - detail.captionedCount;
      this.logger.warn(
        `Dataset "${datasetRef}": ${uncaptioned}/${detail.imageCount} images have no caption file. ` +
        `They will use class_tokens="${datasetOptions.class_tokens ?? ''}" as fallback.`,
      );
    }

    const datasetDto = this.buildDatasetDto(detail.path, datasetOptions);

    this.logger.log(
      `Resolved datasetRef "${datasetRef}" → ${detail.path} ` +
      `(${detail.imageCount} images, ${Math.round(detail.captionCoverage * 100)}% captioned)`,
    );

    return { datasetDto, datasetName: datasetRef };
  }

  /**
   * Build a minimal DatasetTomlDto from a resolved image_dir path and options.
   * Defaults: 1024px, bucket enabled, batch_size 1.
   */
  private buildDatasetDto(
    imageDir: string,
    opts: DatasetRefOptions,
  ): DatasetTomlDto {
    const {
      resolution     = 1024,
      enable_bucket  = true,
      min_bucket_reso,
      max_bucket_reso,
      batch_size     = 1,
      num_repeats,
      shuffle_caption,
      keep_tokens,
      caption_extension,
      class_tokens,
      flip_aug,
    } = opts;

    return {
      datasets: [
        {
          resolution,
          enable_bucket,
          ...(min_bucket_reso !== undefined && { min_bucket_reso }),
          ...(max_bucket_reso !== undefined && { max_bucket_reso }),
          batch_size,
          subsets: [
            {
              image_dir: imageDir,
              ...(num_repeats      !== undefined && { num_repeats }),
              ...(shuffle_caption  !== undefined && { shuffle_caption }),
              ...(keep_tokens      !== undefined && { keep_tokens }),
              ...(caption_extension !== undefined && { caption_extension }),
              ...(class_tokens     !== undefined && { class_tokens }),
              ...(flip_aug         !== undefined && { flip_aug }),
            },
          ],
        },
      ],
    };
  }

  // ── Process management ─────────────────────────────────────────────────────

  private launch(job: TrainingJob): void {
    this.logger.log(`Launching job ${job.id}: ${job.command}`);

    const args = [
      '--config_file', this.paths.accelerateConfig,
      '--num_cpu_threads_per_process', this.cpuThreadsPerProcess,
      path.join(this.paths.sdScripts, job.script),
      '--config_file', job.trainTomlPath,
    ];

    const accelerateBin = process.env['ACCELERATE_BIN'] ?? 'accelerate';

  this.logger.log(`[spawn] bin: ${accelerateBin}`);
  this.logger.log(`[spawn] PATH: ${process.env['PATH']}`);
  this.logger.log(`[spawn] cwd: ${this.paths.sdScripts}`);
  this.logger.log(`[spawn] args: ${['launch', ...args].join(' ')}`);

  // Проверяем что cwd существует
  try {
    require('fs').accessSync(this.paths.sdScripts);
    this.logger.log(`[spawn] cwd exists: yes`);
  } catch {
    this.logger.error(`[spawn] cwd does NOT exist: ${this.paths.sdScripts}`);
  }

    const proc = spawn(accelerateBin, ['launch', ...args], {
      cwd: this.paths.sdScripts,
      env: { ...process.env },
    });

    job.pid       = proc.pid;
    job.status    = JobStatus.Running;
    job.startedAt = new Date().toISOString();
    this.processes.set(job.id, proc);

    const logStream = fsSync.createWriteStream(job.logFilePath, { flags: 'a' });
    let logStreamClosed = false;

    const safeEndStream = () => {
      if (!logStreamClosed) {
        logStreamClosed = true;
        logStream.end();
      }
    };

    const safeAppendLog = (entry: LogLine) => {
      if (!logStreamClosed) {
        this.appendLog(job, entry, logStream);
      } else {
        // Stream already closed — still update in-memory buffer and emit WS event
        job.logBuffer.push(entry);
        if (job.logBuffer.length > this.logBufferSize) job.logBuffer.shift();
        this.emit('job:log', { jobId: job.id, line: entry } as JobLogEvent);
      }
    };

    proc.stdout!.setEncoding('utf8');
    proc.stdout!.on('data', (chunk: string) => {
      this.handleOutput(job, chunk, 'stdout', logStream);
    });

    proc.stderr!.setEncoding('utf8');
    proc.stderr!.on('data', (chunk: string) => {
      this.handleOutput(job, chunk, 'stderr', logStream);
    });

    proc.on('close', (code: number | null, signal: string | null) => {
      safeEndStream();
      this.processes.delete(job.id);

      const exitCode = code ?? (signal ? 1 : 0);
      job.exitCode   = exitCode;
      job.finishedAt = new Date().toISOString();

      if (job.status !== JobStatus.Killed) {
        job.status = exitCode === 0 ? JobStatus.Done : JobStatus.Failed;
      }

      this.logger.log(
        `Job ${job.id} finished: status=${job.status}, exit=${exitCode}, signal=${signal ?? '-'}`,
      );

      this.emit('job:status', { jobId: job.id, status: job.status, exitCode } as JobStatusEvent);
    });

    proc.on('error', (err: Error) => {
      this.processes.delete(job.id);
      job.status     = JobStatus.Failed;
      job.finishedAt = new Date().toISOString();

      this.logger.error(`Job ${job.id} process error: ${err.message}`);
      // Write error to log before closing the stream
      safeAppendLog({ ts: Date.now(), stream: 'stderr', text: `[process error] ${err.message}` });
      safeEndStream();

      this.emit('job:status', { jobId: job.id, status: JobStatus.Failed } as JobStatusEvent);
    });

    this.emit('job:status', { jobId: job.id, status: JobStatus.Running } as JobStatusEvent);
  }

  private handleOutput(
    job: TrainingJob,
    chunk: string,
    stream: LogStream,
    logStream: fsSync.WriteStream,
  ): void {
    const normalised = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (const raw of normalised.split('\n')) {
      const text = raw.trimEnd();
      if (!text) continue;
      this.appendLog(job, { ts: Date.now(), stream, text }, logStream);
    }
  }

  private appendLog(
    job: TrainingJob,
    entry: LogLine,
    logStream: fsSync.WriteStream,
  ): void {
    job.logBuffer.push(entry);
    if (job.logBuffer.length > this.logBufferSize) {
      job.logBuffer.shift();
    }
    logStream.write(`[${new Date(entry.ts).toISOString()}] [${entry.stream}] ${entry.text}\n`);
    this.emit('job:log', { jobId: job.id, line: entry } as JobLogEvent);
  }

  // ── Serialisation helpers ─────────────────────────────────────────────────

  private toSummary(job: TrainingJob): JobSummary {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { logBuffer: _lb, ...summary } = job;
    return summary;
  }

  private toDetail(job: TrainingJob): JobDetail {
    return { ...job };
  }
}