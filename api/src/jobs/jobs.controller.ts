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

import { JobsService } from './jobs.service';
import type { CreateJobDto } from './entities/jobs.types';

/**
 * REST API for training jobs.
 *
 * POST   /jobs          — Create and start a new job
 * GET    /jobs          — List all jobs (summaries, no log buffer)
 * GET    /jobs/:id      — Get job detail including full log buffer
 * GET    /jobs/:id/logs — Get only the log buffer (cheaper poll alternative to WS)
 * DELETE /jobs/:id      — Kill a running job (SIGTERM → SIGKILL after 5 s)
 */
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * POST /jobs
   *
   * Validates, writes TOMLs, spawns accelerate launch.
   * Returns the full job detail (with empty log buffer) on success.
   *
   * 422 — train config validation failed (field-level errors in body)
   * 409 — maximum concurrent jobs already running
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateJobDto) {
    try {
      return await this.jobsService.create(dto);
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

  /**
   * GET /jobs
   * Returns all jobs without their log buffers (cheap for polling / UI list).
   */
  @Get()
  list() {
    return this.jobsService.list();
  }

  /**
   * GET /jobs/:id
   * Returns full job detail including log buffer.
   */
  @Get(':id')
  getOne(@Param('id') id: string) {
    const job = this.jobsService.getById(id);
    if (!job) throw new NotFoundException(`Job not found: ${id}`);
    return job;
  }

  /**
   * GET /jobs/:id/logs
   * Returns only the log buffer array — useful when polling instead of WS.
   */
  @Get(':id/logs')
  getLogs(@Param('id') id: string) {
    const logs = this.jobsService.getLogs(id);
    if (!logs) throw new NotFoundException(`Job not found: ${id}`);
    return { logs };
  }

  /**
   * DELETE /jobs/:id
   * Kill a running job. Idempotent — returns 200 even if already finished.
   * Body: { force?: boolean }  (force=true skips the SIGTERM grace period)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async kill(@Param('id') id: string) {
    const job = this.jobsService.getById(id);
    if (!job) throw new NotFoundException(`Job not found: ${id}`);
    const killed = await this.jobsService.kill(id);
    return { killed, status: this.jobsService.getById(id)?.status };
  }
}