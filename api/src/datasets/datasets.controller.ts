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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { DatasetsService } from './datasets.service';

// 500 MB zip limit — RunPod disks are large, but let's be reasonable
const ZIP_MAX_SIZE_BYTES = 500 * 1024 * 1024;

// 50 MB per individual file
const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * REST API for managing training datasets.
 *
 * GET    /datasets                         — list all datasets
 * GET    /datasets/:name                   — detail + image list
 * DELETE /datasets/:name                   — remove dataset directory
 *
 * POST   /datasets/upload/zip              — upload zip → extract to /workspace/datasets/<name>/
 * POST   /datasets/upload/files            — upload individual files (multipart)
 * POST   /datasets/:name/captions/:image   — upsert caption for a single image
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

  // ── Upload ZIP ─────────────────────────────────────────────────────────────

  /**
   * POST /datasets/upload/zip
   *
   * Multipart body:
   *   file     — the zip archive
   *   name     — target dataset directory name (e.g. "my_char")
   *   overwrite — "true" | "false" (default "true")
   *
   * Returns UploadResult with image/caption counts.
   *
   * Multer stores the file in memory so we can pass the buffer directly to
   * unzipper.  For very large datasets (>500 MB) advise using `POST /datasets/upload/files`.
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
   * caption (.txt) files.  Max 50 files per request.
   *
   * Query: name — dataset directory name (created if missing)
   *
   * Useful for small incremental additions without re-uploading the full dataset.
   */
  @Post('upload/files')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files[]', 50, {
      storage: memoryStorage(),
      limits: { fileSize: FILE_MAX_SIZE_BYTES },
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('name') name: string,
  ) {
    if (!name) {
      throw new BadRequestException('Query param "name" is required');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }
    return this.datasetsService.uploadFiles(name, files);
  }

  // ── Caption management ─────────────────────────────────────────────────────

  /**
   * POST /datasets/:name/captions/:image
   *
   * Body: plain text caption string (Content-Type: text/plain)
   *   — or —
   * Body: JSON { caption: string }  (Content-Type: application/json)
   *
   * Creates or overwrites the .txt caption file matching the image name.
   * The target image must already exist in the dataset.
   *
   * Example:
   *   POST /datasets/my_char/captions/my_char_001.jpg
   *   Body: "a photo of my_char, detailed fur, soft lighting"
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
   * Returns 404 if dataset doesn't exist.
   */
  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  remove(@Param('name') name: string) {
    return this.datasetsService.remove(name);
  }
}