import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

import { JobsService } from './jobs.service';
import type { CreateJobDto } from './dto/create-job.dto';
import { JobDetailResponseDto } from './dto/job-detail.dto';
import { JobSummaryResponseDto } from './dto/job-summary.dto';
import { JobLogsResponseDto } from './dto/job-logs.dto';
import { KillJobResponseDto } from './dto/kill-job.dto';

/**
 * REST API for training jobs.
 *
 * POST   /jobs          — Create and start a new job
 * GET    /jobs          — List all jobs (summaries, no log buffer)
 * GET    /jobs/:id      — Get job detail including full log buffer
 * GET    /jobs/:id/logs — Get only the log buffer (cheaper poll alternative to WS)
 * DELETE /jobs/:id      — Kill a running job (SIGTERM → SIGKILL after 5 s)
 */
@ApiTags('Jobs')
@ApiBearerAuth()
@ApiExtraModels(JobDetailResponseDto, JobSummaryResponseDto)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  // ── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create and start a training job',
    description:
      'Validates the train config, writes `dataset.toml` and `train.toml` to the job directory, ' +
      'then spawns `accelerate launch` in a detached process group. ' +
      'The dataset can be supplied either as a reference to an existing dataset on disk (`datasetRef`) ' +
      'or as an inline `DatasetTomlDto` definition — the two fields are mutually exclusive.',
  })
  @ApiBody({
    description: 'Job creation payload — two mutually exclusive dataset modes',
    schema: {
      oneOf: [
        {
          title: 'CreateJobByRef',
          description: 'Reference an existing dataset by name (resolved from /workspace/datasets/)',
          required: ['train', 'datasetRef'],
          properties: {
            train: {
              type: 'object',
              description:
                'Arch-discriminated training config. Set arch to one of: ' +
                'sd1, sd2, sdxl, flux, chroma, sd3, anima, lumina, hunyuan. ' +
                'Use POST /toml/validate/train to validate before submitting.',
              required: ['arch'],
              properties: {
                arch: {
                  type: 'string',
                  enum: ['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan'],
                },
              },
            },
            datasetRef: {
              type: 'string',
              description: 'Dataset name as it appears under the datasets root directory',
              example: 'portraits-512',
            },
            datasetOptions: {
              type: 'object',
              description:
                'Optional overrides for the auto-generated dataset.toml when using datasetRef. ' +
                'Controls resolution, bucketing, repeats, etc.',
              properties: {
                resolution: { oneOf: [{ type: 'integer' }, { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2 }], example: 1024 },
                enable_bucket: { type: 'boolean', example: true },
                min_bucket_reso: { type: 'integer', example: 256 },
                max_bucket_reso: { type: 'integer', example: 2048 },
                batch_size: { type: 'integer', example: 1 },
                num_repeats: { type: 'integer', example: 10 },
                shuffle_caption: { type: 'boolean', example: false },
                keep_tokens: { type: 'integer', example: 1 },
                caption_extension: { type: 'string', example: '.txt' },
                class_tokens: { type: 'string', example: 'person' },
                flip_aug: { type: 'boolean', example: false },
              },
            },
            sampleImages: {
              type: 'object',
              nullable: true,
              description: 'Optional sample image config — generates preview images during training.',
              properties: {
                prompts: { type: 'array', items: { type: 'object' } },
                activationToken: { type: 'string' },
                captionStyle: { type: 'string', enum: ['natural', 'tags'] },
                every_n_epochs: { type: 'integer' },
                every_n_steps: { type: 'integer' },
                sampler: { type: 'string' },
              },
            }
          },
        },
        {
          title: 'CreateJobInline',
          description: 'Provide a full inline dataset.toml definition',
          required: ['train', 'dataset'],
          properties: {
            train: {
              type: 'object',
              description:
                'Arch-discriminated training config. Set arch to one of: ' +
                'sd1, sd2, sdxl, flux, chroma, sd3, anima, lumina, hunyuan. ' +
                'Use POST /toml/validate/train to validate before submitting.',
              required: ['arch'],
              properties: {
                arch: {
                  type: 'string',
                  enum: ['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan'],
                },
              },
            },
            dataset: {
              type: 'object',
              description: 'Full DatasetTomlDto. Use POST /toml/preview/dataset to preview.',
              required: ['datasets'],
              properties: {
                datasets: { type: 'array', minItems: 1 },
              },
            },
            sampleImages: {
              type: 'object',
              nullable: true,
              description: 'Optional sample image config — generates preview images during training.',
              properties: {
                prompts: { type: 'array', items: { type: 'object' } },
                activationToken: { type: 'string' },
                captionStyle: { type: 'string', enum: ['natural', 'tags'] },
                every_n_epochs: { type: 'integer' },
                every_n_steps: { type: 'integer' },
                sampler: { type: 'string' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Job created and process spawned. Returns full job detail with empty log buffer.',
    type: JobDetailResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Maximum concurrent jobs already running (default limit: 1).',
  })
  @ApiResponse({
    status: 422,
    description: 'Train config validation failed. Body contains field-level errors.',
    schema: {
      properties: {
        message: { type: 'string', example: 'Train config validation failed' },
        validation: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: false },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'learning_rate' },
                  message: { type: 'string', example: 'must be a positive number' },
                },
              },
            },
          },
        },
      },
    },
  })
  async create(@Body() dto: CreateJobDto): Promise<JobDetailResponseDto> {
    try {
      return await this.jobsService.create(dto) as JobDetailResponseDto;
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string; validation?: unknown };
      if (e.statusCode === 422) {
        throw new UnprocessableEntityException({
          message: e.message ?? 'Validation failed',
          validation: e.validation,
        });
      }
      if (e.statusCode === 409) {
        throw new ConflictException(e.message ?? 'Too many running jobs');
      }
      throw err;
    }
  }

  // ── List ───────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all jobs',
    description:
      'Returns all jobs ordered by `createdAt` descending. ' +
      'Does not include the log buffer — use `GET /jobs/:id` or WebSockets for logs. ' +
      'Suitable for polling the jobs list page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of job summaries (no log buffer, no internal command/script fields)',
    type: [JobSummaryResponseDto],
  })
  async list(): Promise<JobSummaryResponseDto[]> {
    return await this.jobsService.list() as JobSummaryResponseDto[];
  }

  // ── Get one ────────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Get job detail',
    description:
      'Returns the full job record plus the in-memory log ring buffer. ' +
      '`logBuffer` is present only while the job is Running — finished jobs have an empty array. ' +
      'For historical logs of finished jobs, read the log file from `logFilePath`.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Job found', type: JobDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getOne(@Param('id') id: string): Promise<JobDetailResponseDto> {
    const job = await this.jobsService.getById(id);
    if (!job) throw new NotFoundException(`Job not found: ${id}`);
    return job as JobDetailResponseDto;
  }

  // ── Logs ───────────────────────────────────────────────────────────────────

  @Get(':id/logs')
  @ApiOperation({
    summary: 'Get in-memory log buffer',
    description:
      'Returns the current ring buffer for a running job without the full job record. ' +
      'Cheaper than `GET /jobs/:id` for clients that only need to poll logs. ' +
      'Prefer WebSockets (`job:subscribe`) for live streaming — this endpoint is a fallback.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Log buffer', type: JobLogsResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getLogs(@Param('id') id: string): JobLogsResponseDto {
    const logs = this.jobsService.getLogs(id);
    return { logs: logs ?? [] };
  }

  // ── Kill ───────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kill a running job',
    description:
      'Sends `SIGTERM` to the entire `accelerate` process group. ' +
      'If the process does not exit within 5 seconds, follows up with `SIGKILL`. ' +
      'Idempotent — returns 200 even if the job is already finished or was never running. ' +
      '`killed: false` means the process was not found (already done/failed/killed).',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Kill attempted', type: KillJobResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async kill(@Param('id') id: string): Promise<KillJobResponseDto> {
    const job = await this.jobsService.getById(id);
    if (!job) throw new NotFoundException(`Job not found: ${id}`);
    const killed = await this.jobsService.kill(id);
    return { killed, status: (await this.jobsService.getById(id))?.status };
  }
}