import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

// import { 
//   DatasetSummaryDto, 
//   DatasetDetailDto, 
//   // DatasetMetaUpdateDto, 
//   // CaptionTypeDetectionResultDto,
//   // UploadResultDto
// } from './dto/datasets.dto';

import { DatasetsService } from './datasets.service';
import { SkipAuth } from 'src/auth/skip-auth.decorator';
import type { DatasetMetaUpdate, PrependMode } from './types/dataset-info.types';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// 500 MB zip limit
const ZIP_MAX_SIZE_BYTES = 500 * 1024 * 1024;

// 50 MB per individual file
const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const VALID_PREPEND_MODES = new Set<PrependMode>([
  'tag_list',
  'nl_prefix',
  'nl_style',
  'nl_character',
]);

/**
 * REST API for managing training datasets.
 *
 * ── Read ────────────────────────────────────────────────────────────────────
 * GET    /datasets                                  list all datasets
 * GET    /datasets/:name                            detail + image list + captionStats
 * GET    /datasets/:name/images/:filename           serve image file  [@SkipAuth]
 * GET    /datasets/:name/export                     download dataset as zip
 *
 * ── Upload ──────────────────────────────────────────────────────────────────
 * POST   /datasets/upload/zip                       upload zip archive
 * POST   /datasets/upload/file                      upload single file
 * PUT    /datasets/:name/images/:filename           replace existing image
 *
 * ── Captions ────────────────────────────────────────────────────────────────
 * GET    /datasets/:name/captions/:image            get caption + stats
 * POST   /datasets/:name/captions/:image            upsert caption
 * DELETE /datasets/:name/captions/:image            clear caption
 * POST   /datasets/:name/captions/prepend-token     bulk prepend activation token
 *
 * ── Metadata ────────────────────────────────────────────────────────────────
 * GET    /datasets/:name/meta                       get dataset.meta.json
 * PATCH  /datasets/:name/meta                       update dataset.meta.json
 * POST   /datasets/:name/detect-caption-type        auto-detect + persist caption type
 *
 * ── Delete ──────────────────────────────────────────────────────────────────
 * DELETE /datasets/:name/images/:filename           delete single image
 * DELETE /datasets/:name                            delete entire dataset
 *
 * NOTE: static sub-routes (upload/zip, upload/file, captions/prepend-token,
 * detect-caption-type, meta, export) are declared BEFORE parameterised routes
 * (:name, :name/images/:filename, etc.) to avoid path-to-regexp v8 conflicts.
 */
@ApiTags('Datasets') // Собирает всё в одну группу в Swagger UI
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // STATIC / UPLOAD ROUTES  (must come before :name routes)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /datasets/upload/zip
   *
   * Multipart body:
   *   file  — zip archive (max 500 MB)
   *   name  — target dataset name
   * Query:
   *   overwrite — "false" to reject if dataset already exists (default: true)
   */
  @Post('upload/zip')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: ZIP_MAX_SIZE_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload a dataset as a zip archive' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Target dataset name' },
        file: { type: 'string', format: 'binary', description: 'Zip archive (max 500 MB)' },
      },
      required: ['name', 'file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Upload Result' })
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
    if (!name) throw new BadRequestException('Body field "name" is required');
    return this.datasetsService.uploadZip(name, file.buffer, overwrite !== 'false');
  }

  /**
   * POST /datasets/upload/file?name=<dataset_name>
   *
   * Multipart field "file" — single image or caption file (max 50 MB).
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
    if (!name) throw new BadRequestException('Query param "name" is required');
    return this.datasetsService.uploadFiles(name, [file]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /datasets */
  @Get()
  list() {
    return this.datasetsService.list();
  }

  /** GET /datasets/:name — includes per-image captionStats and captionLengthSummary */
  @Get(':name')
  getOne(@Param('name') name: string) {
    return this.datasetsService.getOne(name);
  }

  /**
   * GET /datasets/:name/images/:filename
   *
   * Serves a raw image file for UI thumbnails/previews.
   * @SkipAuth — images are referenced directly from <img> tags in the UI.
   * Security: filename is stripped of path separators.
   */
  @SkipAuth()
  @Get(':name/images/:filename')
  async serveImage(
    @Param('name') name: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
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
      throw new NotFoundException(
        `Image "${safeFilename}" not found in dataset "${name}"`,
      );
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(imagePath);
  }

  /**
   * GET /datasets/:name/export
   *
   * Streams the dataset as a zip archive (images + captions + meta.json).
   */
  @Get(':name/export')
  async exportZip(@Param('name') name: string, @Res() res: Response) {
    await this.datasetsService.exportZip(name, res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPLOAD — replace image
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PUT /datasets/:name/images/:filename
   *
   * Replace an existing image in place. Caption is preserved.
   * Multipart field "file" — must be same extension as :filename.
   */
  @Put(':name/images/:filename')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: FILE_MAX_SIZE_BYTES },
    }),
  )
  async replaceImage(
    @Param('name') name: string,
    @Param('filename') filename: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: FILE_MAX_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.datasetsService.replaceImage(name, filename, file);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CAPTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /datasets/:name/captions/prepend-token
   *
   * Bulk-prepend an activation token to all caption files.
   *
   * Body:
   *   token        — activation token string (required)
   *   mode         — 'tag_list' | 'nl_prefix' | 'nl_style' | 'nl_character'
   *                  (default: 'tag_list')
   *   skipExisting — skip captions that already start with the token
   *                  (default: true)
   *
   * IMPORTANT: declared before :name/captions/:image to avoid "prepend-token"
   * being matched as :image by Express.
   */
  @Post(':name/captions/prepend-token')
  @HttpCode(HttpStatus.OK)
  async prependToken(
    @Param('name') name: string,
    @Body() body: { token: string; mode?: PrependMode; skipExisting?: boolean },
  ) {
    if (!body?.token) {
      throw new BadRequestException('Body must contain { token: string }');
    }
    const mode: PrependMode = body.mode ?? 'tag_list';
    if (!VALID_PREPEND_MODES.has(mode)) {
      throw new BadRequestException(
        `Invalid mode "${mode}". Valid: ${[...VALID_PREPEND_MODES].join(', ')}`,
      );
    }
    return this.datasetsService.prependToken(
      name,
      body.token,
      mode,
      body.skipExisting ?? true,
    );
  }

  /**
   * GET /datasets/:name/captions/:image
   *
   * Returns { caption: string | null, captionStats: CaptionStats | null }.
   * Never 404 for missing caption.
   */
  @Get(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  async getCaption(
    @Param('name') name: string,
    @Param('image') image: string,
  ) {
    return this.datasetsService.getCaption(name, path.basename(image));
  }

  /**
   * POST /datasets/:name/captions/:image
   *
   * Body: { caption: string }
   * Creates or overwrites the .txt caption file. Returns captionStats.
   */
  @Post(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  async upsertCaption(
    @Param('name') name: string,
    @Param('image') image: string,
    @Body() body: { caption: string },
  ) {
    const caption = body?.caption;
    if (typeof caption !== 'string') {
      throw new BadRequestException('Body must contain { caption: string }');
    }
    return this.datasetsService.upsertCaption(name, path.basename(image), caption);
  }

  /**
   * DELETE /datasets/:name/captions/:image
   *
   * Removes the .txt caption file. Idempotent.
   */
  @Delete(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  async deleteCaption(
    @Param('name') name: string,
    @Param('image') image: string,
  ) {
    return this.datasetsService.deleteCaption(name, path.basename(image));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /datasets/:name/meta
   *
   * Returns dataset.meta.json contents, or null if not yet created.
   */
  @Get(':name/meta')
  async getMeta(@Param('name') name: string) {
    return this.datasetsService.getMeta(name);
  }

  /**
   * PATCH /datasets/:name/meta
   *
   * Merge-updates dataset.meta.json.
   * Body: Partial<{ activationToken, captionType, notes }>
   */
  @Patch(':name/meta')
  @HttpCode(HttpStatus.OK)
  async updateMeta(
    @Param('name') name: string,
    @Body() body: DatasetMetaUpdate,
  ) {
    return this.datasetsService.updateMeta(name, body);
  }

  /**
   * POST /datasets/:name/detect-caption-type
   *
   * Samples captions, determines style (tag_list / natural_language / mixed),
   * persists to dataset.meta.json, returns detection stats.
   */
  @Post(':name/detect-caption-type')
  @HttpCode(HttpStatus.OK)
  async detectCaptionType(@Param('name') name: string) {
    return this.datasetsService.detectCaptionType(name);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * DELETE /datasets/:name/images/:filename
   *
   * Permanently removes an image and its companion caption file.
   */
  @Delete(':name/images/:filename')
  @HttpCode(HttpStatus.OK)
  async deleteImage(
    @Param('name') name: string,
    @Param('filename') filename: string,
  ) {
    return this.datasetsService.deleteImage(name, path.basename(filename));
  }

  /**
   * DELETE /datasets/:name
   *
   * Permanently removes the entire dataset directory.
   */
  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  remove(@Param('name') name: string) {
    return this.datasetsService.remove(name);
  }
}