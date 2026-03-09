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
  SampleImagesConfig,
  SamplePromptInput,
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

  private get maxConcurrentJobs():    number { return this.settings.getTraining().maxConcurrentJobs;   }
  private get logBufferSize():        number { return this.settings.getTraining().logBufferSize;       }
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
    // 1. Resolve dataset
    const { datasetDto, datasetName } = await this.resolveDataset(dto);

    // 2. Enforce concurrency cap
    const running = [...this.jobs.values()].filter(j => j.status === JobStatus.Running);
    if (running.length >= this.maxConcurrentJobs) {
      throw Object.assign(
        new Error(`Maximum concurrent jobs (${this.maxConcurrentJobs}) already running`),
        { statusCode: 409 },
      );
    }

    // 3. Generate job ID and compute all paths
    const jobId           = randomUUID();
    const jobDir          = this.paths.jobDir(jobId);
    const datasetTomlPath = path.join(jobDir, 'dataset.toml');
    const trainTomlPath   = path.join(jobDir, 'train.toml');
    const logFilePath     = path.join(jobDir, 'train.log');

    // 4. Resolve output_dir early — needed for outputDir record field and
    //    sample_prompts injection into train config
    const outputName = dto.train.output_name || 'untitled';
    const outputDir  = (dto.train.output_dir as string | undefined)
      || path.join(this.paths.outputs, outputName);

    // 5. Build enriched train DTO.
    //    Inject dataset_config and output_dir, then sample params if configured.
    let trainDto: Record<string, unknown> = {
      ...dto.train,
      output_dir:     outputDir,
      dataset_config: datasetTomlPath,
    };

    // 5a. Inject sample image params when sampleImages is provided
    let samplePromptsPath: string | undefined;
    if (dto.sampleImages && dto.sampleImages.prompts.length > 0) {
      samplePromptsPath = path.join(jobDir, 'prompts.txt');
      trainDto = {
        ...trainDto,
        sample_prompts: samplePromptsPath,
        ...(dto.sampleImages.every_n_epochs !== undefined && {
          sample_every_n_epochs: dto.sampleImages.every_n_epochs,
        }),
        ...(dto.sampleImages.every_n_steps !== undefined && {
          sample_every_n_steps: dto.sampleImages.every_n_steps,
        }),
        sample_sampler: dto.sampleImages.sampler ?? 'euler_a',
      };
    }

    // 6. Validate enriched train config
    const validation = validateTrainConfig(trainDto as unknown as Parameters<typeof validateTrainConfig>[0]);
    if (!validation.valid) {
      const messages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw Object.assign(
        new Error(`Train config validation failed — ${messages}`),
        { statusCode: 422, validation },
      );
    }

    // 7. Create job directory (only after validation — no orphaned dirs on 422)
    await fs.mkdir(jobDir, { recursive: true });

    // 8. Write prompts.txt if sampleImages configured
    if (dto.sampleImages && samplePromptsPath) {
      const promptsContent = this.formatPromptsFile(dto.sampleImages);
      await fs.writeFile(samplePromptsPath, promptsContent, 'utf8');
      this.logger.log(`Job ${jobId}: prompts.txt → ${samplePromptsPath}`);
    }

    // 9. Resolve training script
    const script     = this.toml.getTrainScript(dto.train.arch);
    const scriptPath = path.join(this.paths.sdScripts, script);

    // 10. Generate and write TOML files
    const datasetTomlContent = this.toml.generateDatasetToml(datasetDto);
    const trainTomlContent   = this.toml.generateTrainToml(
      trainDto as unknown as Parameters<typeof this.toml.generateTrainToml>[0],
    );

    await fs.writeFile(datasetTomlPath, datasetTomlContent, 'utf8');
    await fs.writeFile(trainTomlPath,   trainTomlContent,   'utf8');

    this.logger.log(`Job ${jobId}: dataset.toml → ${datasetTomlPath}`);
    this.logger.log(`Job ${jobId}: train.toml   → ${trainTomlPath}`);

    // 11. Build display command string
    const command = [
      'accelerate', 'launch',
      '--config_file', this.paths.accelerateConfig,
      '--num_cpu_threads_per_process', this.cpuThreadsPerProcess,
      scriptPath,
      '--config_file', trainTomlPath,
    ].join(' ');

    // 12. Register job record
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
      outputDir,
      samplePromptsPath,
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

  getRaw(id: string): TrainingJob | undefined {
    return this.jobs.get(id);
  }

  getLogs(id: string): LogLine[] | undefined {
    return this.jobs.get(id)?.logBuffer;
  }

  async kill(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status !== JobStatus.Running) return false;

    const proc = this.processes.get(id);
    if (!proc || proc.pid === undefined) return false;

    // Mark as killed BEFORE sending signal — the 'close' handler checks this
    // and must not overwrite it with 'failed' after a user-initiated kill.
    job.status = JobStatus.Killed;
    this.emit('job:status', { jobId: id, status: JobStatus.Killed } as JobStatusEvent);

    const pgid = proc.pid;
    this.logger.log(`Killing job ${id} (PID ${pgid}, process group -${pgid})`);

    try {
      // Kill entire process group: accelerate + all its Python children
      process.kill(-pgid, 'SIGTERM');
    } catch (err) {
      // Process may have already exited between the guard check and here
      this.logger.warn(`SIGTERM to process group -${pgid} failed: ${(err as Error).message}`);
      return false;
    }

    // Give SIGTERM 5 s to clean up, then force-kill
    await new Promise<void>(resolve => setTimeout(resolve, 5000));

    if (this.processes.has(id)) {
      this.logger.warn(`Job ${id}: still alive after 5 s — sending SIGKILL to group -${pgid}`);
      try {
        process.kill(-pgid, 'SIGKILL');
      } catch {
        // Already gone — fine
      }
    }

    return true;
  }

  // ── Sample prompts serialisation ──────────────────────────────────────────

  /**
   * Format SampleImagesConfig into prompts.txt content for sd-scripts.
   *
   * Output format (one line per prompt):
   *   token. Prompt text --d 42 --w 1216 --h 832 --s 28 --c 7.0 --n negative
   */
  private formatPromptsFile(config: SampleImagesConfig): string {
    const { prompts, activationToken, captionStyle = 'natural' } = config;
    const sep = captionStyle === 'natural' ? '. ' : ', ';

    const lines = prompts.map(p => {
      const parts: string[] = [];

      // Build prompt text — prepend activation token unless withoutToken=true
      let promptText = p.prompt;
      if (activationToken && !p.withoutToken) {
        promptText = `${activationToken}${sep}${p.prompt}`;
      }
      parts.push(promptText);

      // Append sd-scripts inline flags
      if (p.seed      !== undefined) parts.push(`--d ${p.seed}`);
      if (p.width     !== undefined) parts.push(`--w ${p.width}`);
      if (p.height    !== undefined) parts.push(`--h ${p.height}`);
      if (p.steps     !== undefined) parts.push(`--s ${p.steps}`);
      if (p.cfg       !== undefined) parts.push(`--c ${p.cfg}`);
      if (p.negativePrompt)          parts.push(`--n ${p.negativePrompt}`);

      return parts.join(' ');
    });

    return lines.join('\n') + '\n';
  }

  // ── Dataset resolution ────────────────────────────────────────────────────

  private async resolveDataset(dto: CreateJobDto): Promise<{
    datasetDto: DatasetTomlDto;
    datasetName: string | undefined;
  }> {
    if (dto.dataset) {
      return { datasetDto: dto.dataset, datasetName: undefined };
    }

    const { datasetRef, datasetOptions = {} } = dto;

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
              caption_extension: caption_extension ?? '.txt',
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

    try {
      require('fs').accessSync(this.paths.sdScripts);
      this.logger.log(`[spawn] cwd exists: yes`);
    } catch {
      this.logger.error(`[spawn] cwd does NOT exist: ${this.paths.sdScripts}`);
    }

    const proc = spawn(accelerateBin, ['launch', ...args], {
      cwd: this.paths.sdScripts,
      env: { ...process.env },
      // detached = true → Node creates a new process group (pgid = proc.pid)
      // This is what makes `process.kill(-pgid, signal)` work to kill all children.
      detached: true,
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

      // Do NOT overwrite Killed status — kill() already set it and emitted the event
      if (job.status !== JobStatus.Killed) {
        job.status = exitCode === 0 ? JobStatus.Done : JobStatus.Failed;
        this.emit('job:status', { jobId: job.id, status: job.status, exitCode } as JobStatusEvent);
      }

      this.logger.log(
        `Job ${job.id} finished: status=${job.status}, exit=${exitCode}, signal=${signal ?? '-'}`,
      );
    });

    proc.on('error', (err: Error) => {
      this.processes.delete(job.id);
      job.status     = JobStatus.Failed;
      job.finishedAt = new Date().toISOString();

      this.logger.error(`Job ${job.id} process error: ${err.message}`);
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