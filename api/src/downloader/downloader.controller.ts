import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath
} from '@nestjs/swagger';

import { DownloaderService } from './downloader.service';
import { DownloadJobDto } from './dto/download-job.dto';
import { StartDownloadDto } from './dto/start-download.dto';
import { PresetDto } from './dto/preset.dto';
import { PresetsGroupedDto } from './dto/presets-grouped.dto';

/**
 * GET    /downloader/presets          list all built-in presets (grouped by arch)
 * GET    /downloader/presets?arch=X   flat array for a specific architecture
 * GET    /downloader                  list all jobs (active + history)
 * POST   /downloader                  start a new download
 * GET    /downloader/:id              get a single job by id
 * DELETE /downloader/:id              cancel a pending or active download
 */
@ApiExtraModels(PresetDto, PresetsGroupedDto)
@ApiTags('Downloader')
@ApiBearerAuth()
@Controller('downloader')
export class DownloaderController {
  constructor(private readonly downloaderService: DownloaderService) { }

  // ── Presets ────────────────────────────────────────────────────────────────

  /**
   * GET /downloader/presets
   *
   * Without ?arch — returns all presets grouped by architecture:
   *   { flux: [...], chroma: [...], sd3: [...], ... }
   *
   * With ?arch=<name> — returns a flat array for that architecture only.
   *
   * Presets with the same `sharedDestination` value map to the same physical
   * file. Downloading any one of them satisfies all arch-tagged variants.
   *
   * IMPORTANT: must be declared before :id to prevent "presets" being matched
   * as a job id by path-to-regexp.
   */
  @Get('presets')
  @ApiOperation({
    summary: 'List built-in model presets',
    description:
      'Returns all presets grouped by architecture. ' +
      'Pass ?arch= to get a flat array for a specific architecture. ' +
      'Presets with the same `sharedDestination` resolve to the same file on disk — ' +
      'the downloader will skip if the file already exists regardless of which ' +
      'arch-specific preset was used.',
  })
  @ApiQuery({
    name: 'arch',
    required: false,
    description: 'Filter to a single architecture (e.g. flux, chroma, sd3)',
    example: 'flux',
  })
  @ApiResponse({
    status: 200,
    description: 'Grouped presets by architecture when ?arch is omitted; flat array when ?arch is provided.',
    schema: {
      oneOf: [
        {
          description: 'No ?arch — object keyed by architecture name',
          $ref: getSchemaPath(PresetsGroupedDto),
        },
        {
          description: '?arch provided — flat array of presets for that architecture',
          type: 'array',
          items: { $ref: getSchemaPath(PresetDto) },
        },
      ],
    },
  })
  presets(@Query('arch') arch?: string): PresetDto[] | PresetsGroupedDto {
    return this.downloaderService.listPresets(arch);
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all download jobs',
    description: 'Returns active and historical jobs, newest first. Jobs are kept in memory until the process restarts.',
  })
  @ApiResponse({ status: 200, description: 'Array of download jobs', type: [DownloadJobDto] })
  list(): DownloadJobDto[] {
    return this.downloaderService.listJobs();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new download',
    description:
      'Option A — preset: `{ "presetId": "flux-dev-dit" }` — all parameters inferred from the preset.\n\n' +
      'Option B — explicit: `{ "url": "...", "arch": "flux", "role": "dit" }` — direct URL download.\n\n' +
      'Returns the job immediately; download runs in the background. ' +
      'If the target file already exists at the resolved destination, ' +
      'the job is returned immediately with status="skipped" — no download is performed. ' +
      'Poll `GET /downloader/:id` for progress.',
  })
  @ApiBody({ type: StartDownloadDto })
  @ApiResponse({ status: 201, description: 'Job created (or skipped if file already exists)', type: DownloadJobDto })
  @ApiResponse({ status: 400, description: 'Unknown preset, missing required fields, or unresolvable URL' })
  async start(@Body() dto: StartDownloadDto): Promise<DownloadJobDto> {
    return this.downloaderService.start(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single download job by id',
    description: 'Returns current status, progress counters, and error if failed.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Job found', type: DownloadJobDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getOne(@Param('id') id: string): DownloadJobDto {
    return this.downloaderService.getJob(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a download job',
    description:
      'Cancels a pending or in-progress download. ' +
      'Partially downloaded files are removed. ' +
      'Returns 400 if the job is already completed, failed, or skipped.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Job cancelled', type: DownloadJobDto })
  @ApiResponse({ status: 400, description: 'Cannot cancel a completed / failed / skipped job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  cancel(@Param('id') id: string): DownloadJobDto {
    return this.downloaderService.cancel(id);
  }
}