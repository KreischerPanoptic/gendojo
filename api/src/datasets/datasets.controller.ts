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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

import { DatasetsService } from './datasets.service';
import { SkipAuth } from 'src/auth/skip-auth.decorator';
import type { PrependMode } from './types/datasets.types';

import { DatasetSummaryDto, DatasetDetailDto, DatasetMetaDto } from './dto/dataset.dto';
import {
  UploadResultDto,
  InitChunkedUploadResponseDto,
  SaveChunkResponseDto,
  CompleteChunkedUploadDto,
} from './dto/upload.dto';
import {
  GetCaptionResponseDto,
  UpsertCaptionDto,
  UpsertCaptionResponseDto,
  DeleteCaptionResponseDto,
  PrependTokenDto,
  PrependTokenResultDto,
  DetectCaptionTypeResultDto,
} from './dto/caption.dto';
import {
  UpdateMetaDto,
  DeleteDatasetResponseDto,
  DeleteImageResponseDto,
  ReplaceImageResponseDto,
} from './dto/meta.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 500 MB zip limit — RunPod disks are large, but let's be reasonable */
const ZIP_MAX_SIZE_BYTES = 500 * 1024 * 1024;

/** 50 MB per individual image/caption file */
const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** 10 MB per chunk — with headroom above the typical 5 MB frontend chunk size */
const CHUNK_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
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
 * POST   /datasets/upload/zip                       upload zip archive (in-memory)
 * POST   /datasets/upload/file                      upload single file
 * POST   /datasets/upload/chunked/init              start chunked upload session
 * POST   /datasets/upload/chunked/chunk             upload one chunk
 * POST   /datasets/upload/chunked/complete          assemble chunks and extract
 * PUT    /datasets/:name/images/:filename           replace existing image
 *
 * ── Captions ────────────────────────────────────────────────────────────────
 * GET    /datasets/:name/captions/:image            get caption + stats
 * POST   /datasets/:name/captions/:image            upsert caption
 * DELETE /datasets/:name/captions/:image            delete caption
 * POST   /datasets/:name/captions/prepend-token     bulk prepend activation token
 *
 * ── Metadata ────────────────────────────────────────────────────────────────
 * GET    /datasets/:name/meta                       read DB metadata
 * PATCH  /datasets/:name/meta                       update DB metadata
 * POST   /datasets/:name/detect-caption-type        auto-detect + persist caption type
 *
 * ── Delete ──────────────────────────────────────────────────────────────────
 * DELETE /datasets/:name/images/:filename           delete single image (+ caption)
 * DELETE /datasets/:name                            delete entire dataset + DB record
 *
 * NOTE: static sub-routes (upload/*, captions/prepend-token, detect-caption-type,
 * meta, export) are declared BEFORE parameterised routes (:name, :filename, …)
 * to prevent path-to-regexp v8 from matching static segments as param values.
 */
@ApiTags('Datasets')
@ApiBearerAuth()
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
   *   overwrite — "false" to reject if dataset already exists (default: merge)
   */
  @Post('upload/zip')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a dataset as a zip archive',
    description:
      'Extracts the zip into /workspace/datasets/<name>/. ' +
      'Flattens one level of nesting. Skips __MACOSX / hidden files. ' +
      'On new datasets, auto-detects caption type and creates a DB metadata record. ' +
      'Pass overwrite=false to reject if the dataset already exists.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file'],
      properties: {
        name: { type: 'string', description: 'Target dataset directory name', example: 'my_char' },
        file: { type: 'string', format: 'binary', description: 'Zip archive (max 500 MB)' },
      },
    },
  })
  @ApiQuery({ name: 'overwrite', required: false, type: Boolean, description: 'Merge into existing dataset (default: true)' })
  @ApiResponse({ status: 201, description: 'Archive extracted successfully', type: UploadResultDto })
  @ApiResponse({ status: 400, description: 'Invalid dataset name or missing fields' })
  @ApiResponse({ status: 409, description: 'Dataset already exists and overwrite=false' })
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
  ): Promise<UploadResultDto> {
    if (!name) throw new BadRequestException('Body field "name" is required');
    return this.datasetsService.uploadZip(name, file.buffer, overwrite !== 'false');
  }

  /**
   * POST /datasets/upload/file?name=<dataset_name>
   *
   * Multipart field "file" — single image (.jpg/.png/.webp) or caption (.txt).
   * Call in parallel from the frontend for multiple files.
   */
  @Post('upload/file')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a single image or caption file to a dataset',
    description:
      'Creates the dataset directory if it does not exist. ' +
      'Accepted extensions: .jpg, .jpeg, .png, .webp, .txt. ' +
      'Call this endpoint in parallel for multiple files.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'name', required: true, description: 'Target dataset directory name', example: 'my_char' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image or caption file (max 50 MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File saved successfully', type: UploadResultDto })
  @ApiResponse({ status: 400, description: 'Missing query param or unsupported file type' })
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
  ): Promise<UploadResultDto> {
    if (!name) throw new BadRequestException('Query param "name" is required');
    return this.datasetsService.uploadFiles(name, [file]);
  }

  // ── Chunked upload ────────────────────────────────────────────────────────

  /**
   * POST /datasets/upload/chunked/init
   *
   * Creates a new chunked upload session.
   * Returns an uploadId to pass to subsequent /chunk and /complete calls.
   */
  @Post('upload/chunked/init')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initialise a chunked upload session',
    description:
      'Use for archives larger than what in-memory upload can handle. ' +
      'Returns an uploadId — pass it to /chunk (multiple times) then /complete.',
  })
  @ApiResponse({ status: 201, description: 'Session created', type: InitChunkedUploadResponseDto })
  async initChunkedUpload(): Promise<InitChunkedUploadResponseDto> {
    return this.datasetsService.initChunkedUpload();
  }

  /**
   * POST /datasets/upload/chunked/chunk
   *
   * Upload one binary chunk of the archive.
   * Multipart body: file (chunk bytes), uploadId, chunkIndex (zero-based).
   */
  @Post('upload/chunked/chunk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload a single chunk to an active upload session' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'uploadId', 'chunkIndex'],
      properties: {
        file:       { type: 'string', format: 'binary', description: 'Chunk binary data (max 10 MB)' },
        uploadId:   { type: 'string', description: 'Session UUID from /init' },
        chunkIndex: { type: 'string', description: 'Zero-based chunk index' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Chunk saved', type: SaveChunkResponseDto })
  @ApiResponse({ status: 400, description: 'Unknown session or invalid chunkIndex' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: CHUNK_MAX_SIZE_BYTES },
    }),
  )
  async uploadChunk(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: CHUNK_MAX_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Body('uploadId') uploadId: string,
    @Body('chunkIndex') chunkIndexStr: string,
  ): Promise<SaveChunkResponseDto> {
    if (!uploadId) throw new BadRequestException('Body field "uploadId" is required');
    if (!chunkIndexStr) throw new BadRequestException('Body field "chunkIndex" is required');

    const chunkIndex = parseInt(chunkIndexStr, 10);
    if (isNaN(chunkIndex) || chunkIndex < 0) {
      throw new BadRequestException('chunkIndex must be a non-negative integer');
    }

    return this.datasetsService.saveChunk(uploadId, chunkIndex, file.buffer);
  }

  /**
   * POST /datasets/upload/chunked/complete
   *
   * Assemble all chunks, extract the resulting zip, and clean up the session.
   * Body: { uploadId, name, totalChunks }
   */
  @Post('upload/chunked/complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Finalise a chunked upload — assemble chunks, extract zip, clean up session',
  })
  @ApiBody({ type: CompleteChunkedUploadDto })
  @ApiQuery({ name: 'overwrite', required: false, type: Boolean, description: 'Merge into existing dataset (default: true)' })
  @ApiResponse({ status: 201, description: 'Archive extracted successfully', type: UploadResultDto })
  @ApiResponse({ status: 400, description: 'Session not found, missing chunk, or invalid body' })
  @ApiResponse({ status: 409, description: 'Dataset already exists and overwrite=false' })
  async completeChunkedUpload(
    @Body() dto: CompleteChunkedUploadDto,
    @Query('overwrite') overwrite?: string,
  ): Promise<UploadResultDto> {
    const { uploadId, name, totalChunks } = dto ?? {};

    if (!uploadId) throw new BadRequestException('Body field "uploadId" is required');
    if (!name) throw new BadRequestException('Body field "name" is required');
    if (!totalChunks || typeof totalChunks !== 'number' || totalChunks < 1) {
      throw new BadRequestException('Body field "totalChunks" must be a positive integer');
    }

    return this.datasetsService.completeChunkedUpload(uploadId, name, totalChunks, overwrite !== 'false');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /datasets */
  @Get()
  @ApiOperation({
    summary: 'List all datasets',
    description:
      'Scans /workspace/datasets/ and returns a summary per directory. ' +
      'DB metadata is merged in a single query (no N+1). ' +
      'CaptionStats are not included — use GET /datasets/:name for those.',
  })
  @ApiResponse({ status: 200, description: 'Array of dataset summaries', type: [DatasetSummaryDto] })
  list(): Promise<DatasetSummaryDto[]> {
    return this.datasetsService.list();
  }

  /** GET /datasets/:name */
  @Get(':name')
  @ApiOperation({
    summary: 'Get full dataset detail',
    description: 'Includes per-image captionStats and aggregate captionLengthSummary.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name', example: 'my_char' })
  @ApiResponse({ status: 200, description: 'Dataset detail', type: DatasetDetailDto })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  getOne(@Param('name') name: string): Promise<DatasetDetailDto> {
    return this.datasetsService.getOne(name);
  }

  /**
   * GET /datasets/:name/images/:filename
   *
   * Serves a raw image file for UI thumbnails and previews.
   * @SkipAuth — images are referenced directly from <img> src attributes.
   * Security: filename is stripped of path separators to prevent traversal.
   */
  @SkipAuth()
  @Get(':name/images/:filename')
  @ApiOperation({ summary: 'Serve an image file from a dataset (no auth required)' })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiParam({ name: 'filename', description: 'Image filename, e.g. my_char_001.jpg' })
  @ApiResponse({ status: 200, description: 'Raw image bytes with correct Content-Type' })
  @ApiResponse({ status: 400, description: 'Unsupported image extension' })
  @ApiResponse({ status: 404, description: 'Image not found in dataset' })
  async serveImage(
    @Param('name') name: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
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

  /**
   * GET /datasets/:name/export
   *
   * Streams the dataset directory as a zip (images + captions + meta.json sidecar).
   */
  @Get(':name/export')
  @ApiOperation({
    summary: 'Download entire dataset as a zip archive',
    description: 'Streams images, captions, and DB metadata as dataset.meta.json. No temp file.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiResponse({ status: 200, description: 'Zip archive stream', content: { 'application/zip': {} } })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  @SkipAuth()
  async exportZip(@Param('name') name: string, @Res() res: Response): Promise<void> {
    await this.datasetsService.exportZip(name, res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPLOAD — replace image
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PUT /datasets/:name/images/:filename
   *
   * Replace an existing image in-place. The companion caption file is preserved.
   * The uploaded file's extension must match the target filename extension.
   */
  @Put(':name/images/:filename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace an existing image in-place (caption preserved)',
    description: 'Extension of the uploaded file must match the target filename extension.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiParam({ name: 'filename', description: 'Filename to replace, e.g. my_char_001.jpg' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Replacement image (max 50 MB, same extension as target)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Image replaced', type: ReplaceImageResponseDto })
  @ApiResponse({ status: 400, description: 'Extension mismatch or unsupported filename' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
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
  ): Promise<ReplaceImageResponseDto> {
    return this.datasetsService.replaceImage(name, filename, file);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CAPTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /datasets/:name/captions/prepend-token
   *
   * IMPORTANT: declared before :name/captions/:image to avoid "prepend-token"
   * being matched as :image by path-to-regexp.
   */
  @Post(':name/captions/prepend-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk-prepend an activation token to all caption files',
    description:
      'Processes all captioned images in the dataset. Images without captions are counted ' +
      'in "missing" and left untouched. Set skipExisting=true (default) to avoid adding ' +
      'duplicate tokens to captions that already start with the token.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiBody({ type: PrependTokenDto })
  @ApiResponse({ status: 200, description: 'Prepend result', type: PrependTokenResultDto })
  @ApiResponse({ status: 400, description: 'Empty token or invalid mode' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async prependToken(
    @Param('name') name: string,
    @Body() dto: PrependTokenDto,
  ): Promise<PrependTokenResultDto> {
    const mode: PrependMode = dto.mode ?? 'tag_list';
    if (!VALID_PREPEND_MODES.has(mode)) {
      throw new BadRequestException(
        `Invalid mode "${mode}". Valid: ${[...VALID_PREPEND_MODES].join(', ')}`,
      );
    }
    return this.datasetsService.prependToken(name, dto.token, mode, dto.skipExisting ?? true);
  }

  /**
   * GET /datasets/:name/captions/:image
   *
   * Returns { caption, captionStats } or { caption: null, captionStats: null }.
   * Never returns 404 for a missing caption — absence is a valid state.
   */
  @Get(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Read the caption for an image',
    description: 'Returns null for both fields when no caption file exists. Never throws 404 for a missing caption.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiParam({ name: 'image', description: 'Image filename, e.g. my_char_001.jpg' })
  @ApiResponse({ status: 200, description: 'Caption text and length stats', type: GetCaptionResponseDto })
  @ApiResponse({ status: 400, description: 'Filename is not a supported image format' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getCaption(
    @Param('name') name: string,
    @Param('image') image: string,
  ): Promise<GetCaptionResponseDto> {
    return this.datasetsService.getCaption(name, path.basename(image));
  }

  /**
   * POST /datasets/:name/captions/:image
   *
   * Creates or overwrites the .txt caption file. Returns captionStats.
   */
  @Post(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or overwrite a caption file for an image' })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiParam({ name: 'image', description: 'Image filename, e.g. my_char_001.jpg' })
  @ApiBody({ type: UpsertCaptionDto })
  @ApiResponse({ status: 200, description: 'Caption written, stats returned', type: UpsertCaptionResponseDto })
  @ApiResponse({ status: 400, description: 'Missing caption text or unsupported image format' })
  @ApiResponse({ status: 404, description: 'Dataset or image not found' })
  async upsertCaption(
    @Param('name') name: string,
    @Param('image') image: string,
    @Body() dto: UpsertCaptionDto,
  ): Promise<UpsertCaptionResponseDto> {
    const caption = dto?.caption;
    if (typeof caption !== 'string') {
      throw new BadRequestException('Body must contain { caption: string }');
    }
    return this.datasetsService.upsertCaption(name, path.basename(image), caption);
  }

  /**
   * DELETE /datasets/:name/captions/:image
   *
   * Removes the .txt caption file. Idempotent — returns { deleted: false } if absent.
   */
  @Delete(':name/captions/:image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a caption file for an image',
    description: 'Idempotent — returns { deleted: false } if no caption existed.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiParam({ name: 'image', description: 'Image filename, e.g. my_char_001.jpg' })
  @ApiResponse({ status: 200, description: 'Deletion result', type: DeleteCaptionResponseDto })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async deleteCaption(
    @Param('name') name: string,
    @Param('image') image: string,
  ): Promise<DeleteCaptionResponseDto> {
    return this.datasetsService.deleteCaption(name, path.basename(image));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /datasets/:name/meta
   *
   * Returns the DB metadata record, or null if none exists yet.
   */
  @Get(':name/meta')
  @ApiOperation({
    summary: 'Read DB metadata for a dataset',
    description: 'Returns null if the dataset was created manually without going through the upload API.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiResponse({ status: 200, description: 'Metadata record or null', type: DatasetMetaDto })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getMeta(@Param('name') name: string): Promise<DatasetMetaDto | null> {
    return this.datasetsService.getMeta(name);
  }

  /**
   * PATCH /datasets/:name/meta
   *
   * Partial update of the DB metadata record.
   * Creates a record with defaults if one doesn't exist yet.
   */
  @Patch(':name/meta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update DB metadata for a dataset',
    description:
      'Partial update — only provided fields are changed. ' +
      'Creates a new record with defaults if one does not exist yet.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiBody({ type: UpdateMetaDto })
  @ApiResponse({ status: 200, description: 'Updated metadata record', type: DatasetMetaDto })
  @ApiResponse({ status: 400, description: 'Invalid field values' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async updateMeta(
    @Param('name') name: string,
    @Body() dto: UpdateMetaDto,
  ): Promise<DatasetMetaDto> {
    return this.datasetsService.updateMeta(name, dto);
  }

  /**
   * POST /datasets/:name/detect-caption-type
   *
   * Samples caption files, determines style, persists to DB, returns stats.
   */
  @Post(':name/detect-caption-type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-detect caption type and persist result to DB metadata',
    description:
      'Samples up to 30 caption files. Classifies as tag_list / natural_language / mixed / unknown. ' +
      'The detected type is persisted to the DB metadata record.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiResponse({ status: 200, description: 'Detection result with updated metadata', type: DetectCaptionTypeResultDto })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async detectCaptionType(@Param('name') name: string): Promise<DetectCaptionTypeResultDto> {
    return this.datasetsService.detectCaptionType(name);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * DELETE /datasets/:name/images/:filename
   *
   * Permanently removes an image file and its companion caption file (if present).
   */
  @Delete(':name/images/:filename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a single image (and its companion caption file)',
    description: 'Throws 404 if the image does not exist. Caption deletion is best-effort.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiParam({ name: 'filename', description: 'Image filename, e.g. my_char_001.jpg' })
  @ApiResponse({ status: 200, description: 'Deletion result', type: DeleteImageResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported image filename' })
  @ApiResponse({ status: 404, description: 'Dataset or image not found' })
  async deleteImage(
    @Param('name') name: string,
    @Param('filename') filename: string,
  ): Promise<DeleteImageResponseDto> {
    return this.datasetsService.deleteImage(name, path.basename(filename));
  }

  /**
   * DELETE /datasets/:name
   *
   * Permanently removes the entire dataset directory and its DB metadata record.
   */
  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an entire dataset',
    description: 'Removes the directory recursively and the associated DB metadata record.',
  })
  @ApiParam({ name: 'name', description: 'Dataset directory name' })
  @ApiResponse({ status: 200, description: 'Dataset deleted', type: DeleteDatasetResponseDto })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  remove(@Param('name') name: string): Promise<DeleteDatasetResponseDto> {
    return this.datasetsService.remove(name);
  }
}