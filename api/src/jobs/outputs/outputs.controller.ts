import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as path from 'path';

import { OutputsService } from './outputs.service';
import { SkipAuth } from 'src/auth/skip-auth.decorator';
import { JobOutputsDto } from './dto/job-outputs.dto';

/**
 * REST API for job output artifacts (checkpoints + sample preview images).
 *
 * All routes are nested under /jobs/:id to keep outputs in job context.
 *
 * GET  /jobs/:id/outputs                    — scan output_dir, return JobOutputsDto
 * GET  /jobs/:id/outputs/previews/:filename — serve a sample PNG     [@SkipAuth]
 * GET  /jobs/:id/outputs/download/:filename — download a checkpoint  [@SkipAuth]
 *
 * Security:
 *   - filename params are stripped with path.basename() before use
 *   - OutputsService only resolves paths inside the job's outputDir
 *   - No path traversal possible
 *
 * NOTE: This controller uses @Controller('jobs') alongside JobsController.
 * NestJS resolves routes by specificity — ':id/outputs*' is more specific
 * than ':id', so there is no conflict.
 */
@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class OutputsController {
  constructor(private readonly outputsService: OutputsService) {}

  /**
   * GET /jobs/:id/outputs
   *
   * Scans the job's output_dir and returns:
   *   - checkpoints[]   sorted by epoch/step ascending (final last)
   *   - prompts[]       parsed from prompts.txt (empty if not configured)
   *   - outputDir       resolved absolute path
   *   - sampleDir       null if sample/ subdirectory doesn't exist yet
   *
   * Safe to call while a job is running — returns whatever is on disk right now.
   */
  @Get(':id/outputs')
  @ApiOperation({
    summary: 'Get job output artifacts',
    description:
      'Scans the job output directory and returns all checkpoints with matched preview images. ' +
      'Safe to poll while the job is running. ' +
      'Checkpoints are sorted by epoch/step ascending; the final checkpoint appears last.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Output artifacts', type: JobOutputsDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getOutputs(@Param('id') id: string): Promise<JobOutputsDto> {
    return this.outputsService.getOutputs(id);
  }

  /**
   * GET /jobs/:id/outputs/previews/:filename
   *
   * Serves a sample preview PNG from {output_dir}/sample/.
   * @SkipAuth — preview images are referenced directly from <img> tags in the UI
   *             and do not contain sensitive model weights.
   * Cached for 1 hour — preview PNGs are immutable once written by sd-scripts.
   */
  @SkipAuth()
  @Get(':id/outputs/previews/:filename')
  @ApiOperation({
    summary: 'Serve a sample preview image (no auth required)',
    description:
      'Returns the raw PNG bytes for a sample image from {output_dir}/sample/. ' +
      'No authentication required — safe for use in <img src="..."> tags.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', format: 'uuid' })
  @ApiParam({ name: 'filename', description: 'Preview PNG filename', example: 'lora_e000004_01_20260308225827.png' })
  @ApiResponse({ status: 200, description: 'PNG image bytes', content: { 'image/png': {} } })
  @ApiResponse({ status: 400, description: 'Not a PNG file' })
  @ApiResponse({ status: 404, description: 'Job or preview file not found' })
  async servePreview(
    @Param('id')       id: string,
    @Param('filename') filename: string,
    @Res()             res: Response,
  ): Promise<void> {
    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.png')) {
      throw new BadRequestException('Only PNG preview files are served from this endpoint');
    }

    const fullPath = await this.outputsService.resolvePreviewPath(id, safeFilename);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(fullPath);
  }

  /**
   * GET /jobs/:id/outputs/download/:filename
   *
   * Triggers a browser download of a checkpoint .safetensors file.
   * @SkipAuth — required to allow direct <a href="..."> downloads from the UI
   *             without having to inject auth headers into the download link.
   * No caching — checkpoints are large and accessed infrequently.
   */
  @SkipAuth()
  @Get(':id/outputs/download/:filename')
  @ApiOperation({
    summary: 'Download a checkpoint file (no auth required)',
    description:
      'Returns the .safetensors checkpoint as an attachment download. ' +
      'No authentication required — safe for direct <a href="..."> download links in the UI.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID', format: 'uuid' })
  @ApiParam({ name: 'filename', description: 'Checkpoint filename', example: 'lora-000004e.safetensors' })
  @ApiResponse({
    status: 200,
    description: 'Checkpoint binary stream — Content-Disposition: attachment',
    content: { 'application/octet-stream': {} },
  })
  @ApiResponse({ status: 400, description: 'Not a .safetensors file' })
  @ApiResponse({ status: 404, description: 'Job or checkpoint not found' })
  async downloadCheckpoint(
    @Param('id')       id: string,
    @Param('filename') filename: string,
    @Res()             res: Response,
  ): Promise<void> {
    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.safetensors')) {
      throw new BadRequestException('Only .safetensors files are available for download');
    }

    const fullPath = await this.outputsService.resolveCheckpointPath(id, safeFilename);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(fullPath);
  }
}