import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import { PathsConfig } from '../config/paths.config';
import { SettingsService } from '../settings/settings.service';
import { TomlService } from '../toml/toml.service';
import { DatasetsService } from '../datasets/datasets.service';
import { validateTrainConfig } from '../utils/toml';

import type { DatasetTomlDto } from '../toml/dto/dataset-toml.dto';
import {
  JobStatus,
  DatasetRefOptions,
  SampleImagesConfig,
  LogLine,
  LogStream,
  JobProgress,
} from './types/jobs.types';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { JobLogEvent, JobStatusEvent } from './events/jobs.events';
import { JobDetailResponseDto } from './dto/job-detail.dto';
import { JobSummaryResponseDto } from './dto/job-summary.dto';

// Matches: steps:  10%|███       | 2775/27750 [05:15<45:22,  1.42it/s, avr_loss=0.0979]
const TQDM_REGEX = /steps:\s+(\d+)%\|.*\|\s+(\d+)\/(\d+)\s+\[([^<]+)<([^,]+),\s+([0-9.]+(?:it\/s|s\/it)),\s+avr_loss=([0-9.]+)\]/;

@Injectable()
export class JobsService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);

  // Transient state
  private readonly processes = new Map<string, ChildProcess>();
  private readonly liveLogs = new Map<string, LogLine[]>();
  private readonly liveProgress = new Map<string, JobProgress>();

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    private readonly paths: PathsConfig,
    private readonly settings: SettingsService,
    private readonly toml: TomlService,
    private readonly datasets: DatasetsService,
  ) {
    super();
    this.setMaxListeners(100);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    // DB Magic: bulk update all jobs that didn't survive a server restart
    const result = await this.jobsRepo.update(
      { status: In([JobStatus.Pending, JobStatus.Running]) },
      { status: JobStatus.Failed, finishedAt: new Date() }
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} orphaned jobs as Failed`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying module — sending SIGTERM to running processes');
    for (const [_, proc] of this.processes) {
      if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async create(dto: CreateJobDto): Promise<JobDetailResponseDto> {
    const { datasetDto, datasetName } = await this.resolveDataset(dto);

    // Limit check via DB
    const runningCount = await this.jobsRepo.count({ where: { status: JobStatus.Running } });
    if (runningCount >= (this.settings.getTraining().maxConcurrentJobs ?? 1)) {
      throw Object.assign(new Error('Too many running jobs'), { statusCode: 409 });
    }

    const jobId = randomUUID();
    const jobDir = this.paths.jobDir(jobId);
    const datasetTomlPath = path.join(jobDir, 'dataset.toml');
    const trainTomlPath = path.join(jobDir, 'train.toml');
    const logFilePath = path.join(jobDir, 'train.log');

    // Resolve output_dir
    const outputName = dto.train.output_name || 'untitled';
    const isoDate = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputDir = (dto.train.output_dir as string | undefined)
      ?? path.join(this.paths.outputs, outputName, `${jobId}-${isoDate}`);

    // Build enriched train DTO
    let trainDto: Record<string, unknown> = {
      ...dto.train,
      output_dir: outputDir,
      dataset_config: datasetTomlPath,
    };

    // Inject sample image params
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

    // Validate config
    const validation = validateTrainConfig(trainDto as unknown as Parameters<typeof validateTrainConfig>[0]);
    if (!validation.valid) {
      const messages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw Object.assign(
        new Error(`Train config validation failed — ${messages}`),
        { statusCode: 422, validation },
      );
    }

    // Create directories and write files
    await fs.mkdir(jobDir, { recursive: true });

    if (dto.sampleImages && samplePromptsPath) {
      const promptsContent = this.formatPromptsFile(dto.sampleImages);
      await fs.writeFile(samplePromptsPath, promptsContent, 'utf8');
      this.logger.log(`Job ${jobId}: prompts.txt → ${samplePromptsPath}`);
    }

    const script = this.toml.getTrainScript(dto.train.arch);
    const scriptPath = path.join(this.paths.sdScripts, script);

    const datasetTomlContent = this.toml.generateDatasetToml(datasetDto);
    const trainTomlContent = this.toml.generateTrainToml(
      trainDto as unknown as Parameters<typeof this.toml.generateTrainToml>[0],
    );

    await fs.writeFile(datasetTomlPath, datasetTomlContent, 'utf8');
    await fs.writeFile(trainTomlPath, trainTomlContent, 'utf8');

    const command = [
      'accelerate', 'launch',
      '--config_file', this.paths.accelerateConfig,
      '--num_cpu_threads_per_process', (this.settings.getTraining().cpuThreadsPerProcess ?? 1),
      scriptPath,
      '--config_file', trainTomlPath,
    ].join(' ');

    // Save job to DB
    const job = this.jobsRepo.create({
      id: jobId,
      name: dto.train.output_name || (datasetName ?? 'untitled'),
      arch: dto.train.arch,
      datasetName,
      jobDir,
      datasetTomlPath,
      trainTomlPath,
      logFilePath,
      script,
      command,
      status: JobStatus.Pending,
      outputDir,
      samplePromptsPath,
    });

    await this.jobsRepo.save(job);

    // Initialize empty log buffer for WebSockets
    this.liveLogs.set(job.id, []);

    this.launch(job).catch(err =>
      this.logger.error(`Failed to launch job ${job.id}: ${(err as Error).message}`)
    );
    return { ...job, logBuffer: [] };
  }

  async list(): Promise<JobSummaryResponseDto[]> {
    return this.jobsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getById(id: string): Promise<JobDetailResponseDto | null> {
    const job = await this.jobsRepo.findOneBy({ id });
    if (!job) return null;

    const logBuffer = this.liveLogs.get(id) || [];
    return { ...job, logBuffer };
  }

  getLogs(id: string): LogLine[] {
    return this.liveLogs.get(id) ?? [];
  }

  async kill(id: string): Promise<boolean> {
    const job = await this.jobsRepo.findOneBy({ id });
    if (!job || job.status !== JobStatus.Running) return false;

    const proc = this.processes.get(id);
    if (!proc || proc.pid === undefined) return false;

    const pgid = proc.pid;
    this.logger.log(`Killing job ${id} (PID ${pgid}, process group -${pgid})`);

    try {
      process.kill(-pgid, 'SIGTERM');
      job.status = JobStatus.Killed;
      job.finishedAt = new Date();
      this.emit('job:status', { jobId: id, status: JobStatus.Killed } as JobStatusEvent);
      await this.jobsRepo.save(job);
    } catch (err) {
      this.logger.warn(`SIGTERM to process group -${pgid} failed: ${(err as Error).message}`);
      return false;
    }

    await new Promise<void>(resolve => setTimeout(resolve, 5000));

    if (this.processes.has(id)) {
      this.logger.warn(`Job ${id}: still alive after 5 s — sending SIGKILL to group -${pgid}`);
      try {
        process.kill(-pgid, 'SIGKILL');
      } catch {
        // Already gone
      }
    }

    return true;
  }

  // ── Sample prompts serialisation ──────────────────────────────────────────

  private formatPromptsFile(config: SampleImagesConfig): string {
    const { prompts, activationToken, captionStyle = 'natural' } = config;
    const sep = captionStyle === 'natural' ? '. ' : ', ';

    const lines = prompts.map(p => {
      const parts: string[] = [];

      let promptText = p.prompt;
      if (activationToken && !p.withoutToken) {
        promptText = `${activationToken}${sep}${p.prompt}`;
      }
      parts.push(promptText);

      if (p.seed !== undefined) parts.push(`--d ${p.seed}`);
      if (p.width !== undefined) parts.push(`--w ${p.width}`);
      if (p.height !== undefined) parts.push(`--h ${p.height}`);
      if (p.steps !== undefined) parts.push(`--s ${p.steps}`);
      if (p.cfg !== undefined) parts.push(`--c ${p.cfg}`);
      if (p.negativePrompt) parts.push(`--n ${p.negativePrompt}`);

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
      resolution = 1024,
      enable_bucket = true,
      min_bucket_reso,
      max_bucket_reso,
      batch_size = 1,
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
              ...(num_repeats !== undefined && { num_repeats }),
              ...(shuffle_caption !== undefined && { shuffle_caption }),
              ...(keep_tokens !== undefined && { keep_tokens }),
              caption_extension: caption_extension ?? '.txt',
              ...(class_tokens !== undefined && { class_tokens }),
              ...(flip_aug !== undefined && { flip_aug }),
            },
          ],
        },
      ],
    };
  }

  // ── Process management ─────────────────────────────────────────────────────

  private async launch(job: Job): Promise<void> {
    this.logger.log(`Launching job ${job.id}: ${job.command}`);

    const args = [
      '--config_file', this.paths.accelerateConfig,
      '--num_cpu_threads_per_process', `${(this.settings.getTraining().cpuThreadsPerProcess ?? 1)}`,
      path.join(this.paths.sdScripts, job.script),
      '--config_file', job.trainTomlPath,
    ];

    const accelerateBin = process.env['ACCELERATE_BIN'] ?? 'accelerate';

    const proc = spawn(accelerateBin, ['launch', ...args], {
      cwd: this.paths.sdScripts,
      env: { ...process.env },
      detached: true,
    });

    job.status = JobStatus.Running;
    job.startedAt = new Date();
    this.processes.set(job.id, proc);

    await this.jobsRepo.save(job);

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
        // Fallback if the stream closed but we still caught a stray log
        const buffer = this.liveLogs.get(job.id) || [];
        buffer.push(entry);
        if (buffer.length > (this.settings.getTraining().logBufferSize ?? 200)) {
          buffer.shift();
        }
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

    proc.on('close', async (code: number | null, signal: string | null) => {
      safeEndStream();
      this.processes.delete(job.id);

      const exitCode = code ?? (signal ? 1 : 0);
      job.exitCode = exitCode;
      job.finishedAt = new Date();

      // Extract final stats from transient memory before cleaning up
      const finalProgress = this.liveProgress.get(job.id);
      if (finalProgress) {
        job.finalLoss = finalProgress.avrLoss;
        job.totalSteps = finalProgress.totalSteps;
      }
      this.liveProgress.delete(job.id);

      if (job.status !== JobStatus.Killed) {
        job.status = exitCode === 0 ? JobStatus.Done : JobStatus.Failed;
        this.emit('job:status', { jobId: job.id, status: job.status, exitCode } as JobStatusEvent);
      }

      await this.jobsRepo.save(job);

      this.logger.log(
        `Job ${job.id} finished: status=${job.status}, exit=${exitCode}, signal=${signal ?? '-'}`,
      );
    });

    proc.on('error', async (err: Error) => {
      this.processes.delete(job.id);
      job.status = JobStatus.Failed;
      job.finishedAt = new Date();
      this.liveProgress.delete(job.id);

      this.logger.error(`Job ${job.id} process error: ${err.message}`);
      safeAppendLog({ ts: Date.now(), stream: 'stderr', text: `[process error] ${err.message}` });
      safeEndStream();

      await this.jobsRepo.save(job);
      this.emit('job:status', { jobId: job.id, status: JobStatus.Failed } as JobStatusEvent);
    });

    this.emit('job:status', { jobId: job.id, status: JobStatus.Running } as JobStatusEvent);
  }

  private handleOutput(
    job: Job,
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

  private appendLog(job: Job, entry: LogLine, logStream: fsSync.WriteStream): void {
    // 1. Manage in-memory log buffer
    const buffer = this.liveLogs.get(job.id) || [];
    if (!this.liveLogs.has(job.id)) this.liveLogs.set(job.id, buffer); // Safety check

    buffer.push(entry);
    if (buffer.length > (this.settings.getTraining().logBufferSize ?? 200)) {
      buffer.shift();
    }

    // 2. Write to disk
    logStream.write(`[${new Date(entry.ts).toISOString()}] [${entry.stream}] ${entry.text}\n`);

    // 3. Broadcast standard log event
    this.emit('job:log', { jobId: job.id, line: entry });

    // 4. Try to parse training progress from stderr
    if (entry.stream === 'stderr') {
      const match = entry.text.match(TQDM_REGEX);
      if (match) {
        const progress: JobProgress = {
          percent: parseInt(match[1], 10),
          step: parseInt(match[2], 10),
          totalSteps: parseInt(match[3], 10),
          elapsed: match[4],
          eta: match[5],
          speed: match[6],
          avrLoss: parseFloat(match[7]),
        };

        // Update transient state
        this.liveProgress.set(job.id, progress);

        // Broadcast progress event specifically for UI progress bars
        this.emit('job:progress', { jobId: job.id, progress });
      }
    }
  }
}