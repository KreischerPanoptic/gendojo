import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  Query,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

import { DatasetsService } from './datasets.service';
import { SkipAuth } from 'src/auth/skip-auth.decorator';

// 500 MB zip limit — RunPod disks are large, but let's be reasonable
const ZIP_MAX_SIZE_BYTES = 500 * 1024 * 1024;

// 50 MB per individual file
const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * REST API for managing training datasets.
 *
 * GET    /datasets                              — list all datasets
 * GET    /datasets/:name                        — detail + image list
 * GET    /datasets/:name/images/:filename       — serve a single image file
 * DELETE /datasets/:name                        — remove dataset directory
 *
 * POST   /datasets/upload/zip                   — upload zip → extract to /workspace/datasets/<n>/
 * POST   /datasets/upload/files                 — upload individual files (multipart)
 * POST   /datasets/:name/captions/:image        — upsert caption for a single image
 */
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  // ── Read ───────────────────────────────────────────────────────────────────

  /** GET /datasets */
  @Get()
  list() {
    return this.datasetsService.list();
  }

  /** GET /datasets/:name */
  @Get(':name')
  getOne(@Param('name') name: string) {
    return this.datasetsService.getOne(name);
  }

  /**
   * GET /datasets/:name/images/:filename
   *
   * Serves a single image file from the dataset directory.
   * The filename must be an image supported by sd-scripts (jpg/jpeg/png/webp).
   *
   * Used by the UI to render image thumbnails and previews in the dataset editor.
   *
   * Security: filename is stripped of any path separators to prevent traversal.
   */
  @SkipAuth()
  @Get(':name/images/:filename')
  async serveImage(
    @Param('name') name: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Strip any path separators — no traversal allowed
    const safeFilename = path.basename(filename);
    const ext = path.extname(safeFilename).toLowerCase();

    const mimeType = IMAGE_MIME[ext];
    if (!mimeType) {
      throw new BadRequestException(`Unsupported image extension: ${ext}`);
    }

    const imagePath = await this.datasetsService.resolveImagePath(name, safeFilename);

    try {
      await fs.access(imagePath);
    } catch {
      throw new NotFoundException(`Image "${safeFilename}" not found in dataset "${name}"`);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(imagePath);
  }

  // ── Upload ZIP ─────────────────────────────────────────────────────────────

  /**
   * POST /datasets/upload/zip
   *
   * Multipart body:
   *   file      — the zip archive
   *   name      — target dataset directory name (e.g. "my_char")
   *   overwrite — "true" | "false" (default "true")
   */
  @Post('upload/zip')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: ZIP_MAX_SIZE_BYTES },
    }),
  )
  async uploadZip(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: ZIP_MAX_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Body('name') name: string,
    @Query('overwrite') overwrite?: string,
  ) {
    if (!name) {
      throw new BadRequestException('Body field "name" is required');
    }
    const shouldOverwrite = overwrite !== 'false';
    return this.datasetsService.uploadZip(name, file.buffer, shouldOverwrite);
  }

  // ── Upload individual files ────────────────────────────────────────────────

  /**
   * POST /datasets/upload/files?name=<dataset_name>
   *
   * Multipart body: field "files[]" — one or more image (.jpg/.png/.webp) or
   * caption (.txt) files. Files are sent one per request, called in parallel.
   */
  @Post('upload/file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: FILE_MAX_SIZE_BYTES },
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: FILE_MAX_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Query('name') name: string,
  ) {
    if (!name) {
      throw new BadRequestException('Query param "name" is required');
    }
    return this.datasetsService.uploadFiles(name, [file]);
  }

  // ── Caption management ─────────────────────────────────────────────────────

  /**
   * GET /datasets/:name/captions/:image
   *
   * Returns the caption text for a given image.
   * Responds with { caption: string } if the .txt file exists,
   * or { caption: null } if no caption has been written yet.
   * Never returns 404 for a missing caption — absence is valid.
   */
  @Get(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  async getCaption(
    @Param('name') name: string,
    @Param('image') image: string,
  ) {
    const safeImage = path.basename(image);
    return this.datasetsService.getCaption(name, safeImage);
  }

  /**
   * POST /datasets/:name/captions/:image
   *
   * Body: JSON { caption: string }
   * Creates or overwrites the .txt caption file matching the image name.
   */
  @Post(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  async upsertCaption(
    @Param('name') name: string,
    @Param('image') image: string,
    @Body() body: string | { caption: string },
  ) {
    const caption =
      typeof body === 'string' ? body : (body as { caption: string }).caption;

    if (!caption || typeof caption !== 'string') {
      throw new BadRequestException('Caption text is required in request body');
    }

    return this.datasetsService.upsertCaption(name, image, caption);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * DELETE /datasets/:name
   *
   * Permanently removes the dataset directory and all its contents.
   */
  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  remove(@Param('name') name: string) {
    return this.datasetsService.remove(name);
  }
}