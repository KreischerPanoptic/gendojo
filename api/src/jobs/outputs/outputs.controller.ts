import {
  Controller,
  Get,
  Param,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';

import { OutputsService } from './outputs.service';
import { SkipAuth } from 'src/auth/skip-auth.decorator';

/**
 * REST API for job output artifacts (checkpoints + preview images).
 *
 * All routes are nested under /jobs/:id to keep outputs in job context.
 *
 * GET  /jobs/:id/outputs                    — scan output_dir, return JobOutputs
 * GET  /jobs/:id/outputs/previews/:filename — serve a sample PNG (SkipAuth)
 * GET  /jobs/:id/outputs/download/:filename — download a checkpoint .safetensors
 *
 * Security:
 *   - filename params are passed through path.basename() before use
 *   - OutputsService only resolves paths inside the job's outputDir
 *   - No path traversal possible
 *
 * NOTE: This controller uses @Controller('jobs') alongside JobsController.
 * NestJS resolves routes by specificity — ':id/outputs' is more specific
 * than ':id', so there is no conflict.
 */
@Controller('jobs')
export class OutputsController {
  constructor(private readonly outputsService: OutputsService) {}

  /**
   * GET /jobs/:id/outputs
   *
   * Scans the job's output_dir on disk and returns:
   *   - checkpoints[] with epoch/step/size and matching preview filenames
   *   - prompts[]     parsed from prompts.txt
   *   - outputDir     resolved absolute path
   *   - sampleDir     null if sample/ subdirectory doesn't exist yet
   *
   * Safe to call while job is running — returns whatever is on disk right now.
   * Poll every few seconds during training to show new checkpoints/previews.
   */
  @Get(':id/outputs')
  async getOutputs(@Param('id') id: string) {
    return this.outputsService.getOutputs(id);
  }

  /**
   * GET /jobs/:id/outputs/previews/:filename
   *
   * Serves a sample preview PNG from {output_dir}/sample/.
   * SkipAuth — preview images don't contain sensitive model weights.
   * Cached for 1 hour (images are immutable once written by sd-scripts).
   */
  @SkipAuth()
  @Get(':id/outputs/previews/:filename')
  async servePreview(
    @Param('id')       id: string,
    @Param('filename') filename: string,
    @Res()             res: Response,
  ) {
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
   * Triggers a browser download for a checkpoint .safetensors file.
   * Content-Disposition: attachment causes the browser to save the file.
   * No caching — checkpoints can be large and are accessed infrequently.
   */
  @Get(':id/outputs/download/:filename')
  async downloadCheckpoint(
    @Param('id')       id: string,
    @Param('filename') filename: string,
    @Res()             res: Response,
  ) {
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