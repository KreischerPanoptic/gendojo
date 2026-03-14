import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

import { PathsConfig } from '../config/paths.config';
import { DatasetMetadata } from './entities/dataset-metadata.entity';
import {
  CAPTION_LENGTH_THRESHOLDS,
  type CaptionLengthSummary,
  type CaptionStats,
  type CaptionType,
  type CaptionTypeDetectionResult,
  type DatasetDetail,
  type DatasetImage,
  type DatasetMeta,
  type DatasetMetaUpdate,
  type DatasetSummary,
  type PrependMode,
  type PrependTokenResult,
  type UploadResult,
} from './types/datasets.types';
import { isCaption, isImage, stem } from 'src/utils/dataset';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum number of caption files to sample for caption-type detection */
const DETECTION_SAMPLE_SIZE = 30;

/** Fraction of sample ≥ this → tag_list */
const TAG_LIST_THRESHOLD = 0.6;

/** Fraction of sample ≤ this → natural_language (everything between → mixed) */
const MIXED_THRESHOLD = 0.2;

// ─────────────────────────────────────────────────────────────────────────────
// DatasetsService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly paths: PathsConfig,
    @InjectRepository(DatasetMetadata)
    private readonly metaRepo: Repository<DatasetMetadata>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Scan the datasets root and return a summary for each subdirectory.
   * Non-directory entries are silently ignored.
   *
   * All DB metadata is loaded in a single query to avoid N+1.
   * CaptionStats are NOT included in list summaries — use getOne() for that.
   */
  async list(): Promise<DatasetSummary[]> {
    await this.ensureDatasetsRoot();

    let entries: string[];
    try {
      entries = await fs.readdir(this.paths.datasets);
    } catch {
      return [];
    }

    // Single query — map name → entity for O(1) lookup inside the loop
    const allMeta = await this.metaRepo.find();
    const metaMap = new Map<string, DatasetMeta>(
      allMeta.map((m) => [m.name, this.entityToMeta(m)]),
    );

    const results: DatasetSummary[] = [];

    for (const entry of entries) {
      const fullPath = path.join(this.paths.datasets, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) continue;

        const summary = await this.summarise(
          entry,
          fullPath,
          stat.mtime,
          metaMap.get(entry) ?? null,
        );
        results.push(summary);
      } catch {
        // Inaccessible directory — skip silently
      }
    }

    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * Return full detail (including image list + per-image captionStats) for a
   * named dataset. Throws NotFoundException if the directory doesn't exist.
   */
  async getOne(name: string): Promise<DatasetDetail> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const stat = await fs.stat(datasetPath);
    const files = await fs.readdir(datasetPath);

    const captionStems = new Set(
      files.filter(isCaption).map((f) => stem(f)),
    );

    const images: DatasetImage[] = [];
    for (const file of files) {
      if (!isImage(file)) continue;
      const filePath = path.join(datasetPath, file);
      const fileStat = await fs.stat(filePath);
      const hasCaption = captionStems.has(stem(file));

      let captionStats: CaptionStats | null = null;
      if (hasCaption) {
        const captionPath = path.join(datasetPath, `${stem(file)}.txt`);
        const text = await fs.readFile(captionPath, 'utf8').catch(() => '');
        captionStats = this.computeCaptionStats(text);
      }

      images.push({
        filename: file,
        path: filePath,
        sizeBytes: fileStat.size,
        hasCaption,
        captionStats,
      });
    }

    // Sort: numeric filenames first (by number), otherwise lexicographic
    const isAllNumbered = images.every(
      (a) => !isNaN(Number(a.filename.replace(/\b0+/g, '').replace(/\.[^/.]+$/, ''))),
    );
    if (isAllNumbered) {
      images.sort(
        (a, b) =>
          Number(a.filename.replace(/\b0+/g, '').replace(/\.[^/.]+$/, '')) -
          Number(b.filename.replace(/\b0+/g, '').replace(/\.[^/.]+$/, '')),
      );
    } else {
      images.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    const captionedImages = images.filter((i) => i.hasCaption);
    const captionedCount = captionedImages.length;
    const meta = await this.findMetaByName(name);

    const captionLengthSummary: CaptionLengthSummary | null =
      captionedCount > 0
        ? this.computeCaptionLengthSummary(captionedImages.map((i) => i.captionStats!))
        : null;

    return {
      name,
      path: datasetPath,
      imageCount: images.length,
      captionedCount,
      captionCoverage: images.length > 0 ? captionedCount / images.length : 0,
      updatedAt: stat.mtime.toISOString(),
      meta,
      images,
      captionLengthSummary,
    };
  }

  /**
   * Resolve the absolute path to an image file inside a dataset.
   * Used by the controller to serve image files directly.
   */
  async resolveImagePath(name: string, filename: string): Promise<string> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);
    return path.join(datasetPath, filename);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPLOAD
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Extract a zip archive into /workspace/datasets/<n>/.
   *
   * - Flattens one level of directory nesting (common when zipping a folder)
   * - Skips __MACOSX, .DS_Store and other hidden junk
   * - Merges files on conflict unless overwrite=false (throws 409)
   * - On new dataset: auto-detects caption type, creates DB metadata record
   * - On existing dataset: ensures DB record exists (upserts defaults)
   */
  async uploadZip(
    name: string,
    zipBuffer: Buffer,
    overwrite = true,
  ): Promise<UploadResult> {
    this.validateName(name);
    const datasetPath = this.datasetPath(name);

    if (!overwrite && fsSync.existsSync(datasetPath)) {
      throw new ConflictException(
        `Dataset "${name}" already exists. Pass overwrite=true to merge.`,
      );
    }

    const isNew = !fsSync.existsSync(datasetPath);
    await fs.mkdir(datasetPath, { recursive: true });

    const { imageCount, captionCount, skippedFiles } =
      await this.extractZipBuffer(zipBuffer, datasetPath);

    this.logger.log(
      `Dataset "${name}": extracted ${imageCount} images + ${captionCount} captions from zip, skipped ${skippedFiles.length}`,
    );

    await this.upsertMetaAfterUpload(name, datasetPath, isNew);

    return {
      name,
      path: datasetPath,
      extractedFiles: imageCount + captionCount,
      imageCount,
      captionCount,
      skippedFiles,
    };
  }

  /**
   * Upload individual image/caption files (multipart) to a dataset.
   * Creates the dataset directory and DB metadata record if they don't exist.
   */
  async uploadFiles(
    name: string,
    files: Express.Multer.File[],
  ): Promise<UploadResult> {
    this.validateName(name);
    const datasetPath = this.datasetPath(name);

    const isNew = !fsSync.existsSync(datasetPath);
    await fs.mkdir(datasetPath, { recursive: true });

    const skippedFiles: string[] = [];
    let imageCount = 0;
    let captionCount = 0;

    for (const file of files) {
      const originalName = file.originalname;
      if (!isImage(originalName) && !isCaption(originalName)) {
        skippedFiles.push(originalName);
        continue;
      }
      const destPath = path.join(datasetPath, path.basename(originalName));
      await fs.writeFile(destPath, file.buffer);

      if (isImage(originalName)) imageCount++;
      else captionCount++;
    }

    this.logger.log(
      `Dataset "${name}": saved ${imageCount} images + ${captionCount} captions via multipart, skipped ${skippedFiles.length}`,
    );

    await this.upsertMetaAfterUpload(name, datasetPath, isNew);

    return {
      name,
      path: datasetPath,
      extractedFiles: imageCount + captionCount,
      imageCount,
      captionCount,
      skippedFiles,
    };
  }

  /**
   * Replace a single image in the dataset. Caption is preserved.
   * The extension of the incoming file must match the target filename.
   */
  async replaceImage(
    name: string,
    filename: string,
    file: Express.Multer.File,
  ): Promise<{ path: string }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const safeFilename = path.basename(filename);
    if (!isImage(safeFilename)) {
      throw new BadRequestException(
        `"${safeFilename}" is not a supported image filename`,
      );
    }

    const targetExt = path.extname(safeFilename).toLowerCase();
    const incomingExt = path.extname(file.originalname).toLowerCase();
    if (targetExt !== incomingExt) {
      throw new BadRequestException(
        `Extension mismatch: target is ${targetExt}, uploaded file is ${incomingExt}`,
      );
    }

    const destPath = path.join(datasetPath, safeFilename);
    await fs.writeFile(destPath, file.buffer);
    this.logger.debug(`Replaced image: ${destPath}`);

    return { path: destPath };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CAPTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Read the caption text for a given image.
   * Returns { caption, captionStats } or { caption: null, captionStats: null }.
   * Never throws 404 for a missing caption — absence is a valid state.
   */
  async getCaption(
    name: string,
    imageName: string,
  ): Promise<{ caption: string | null; captionStats: CaptionStats | null }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    if (!isImage(imageName)) {
      throw new BadRequestException(
        `"${imageName}" is not a supported image filename`,
      );
    }

    const captionPath = path.join(datasetPath, `${stem(imageName)}.txt`);
    try {
      const text = await fs.readFile(captionPath, 'utf8');
      const trimmed = text.trim();
      return { caption: trimmed, captionStats: this.computeCaptionStats(trimmed) };
    } catch {
      return { caption: null, captionStats: null };
    }
  }

  /**
   * Write (or overwrite) a single caption file.
   * The target image must already exist in the dataset.
   */
  async upsertCaption(
    name: string,
    imageName: string,
    caption: string,
  ): Promise<{ captionPath: string; captionStats: CaptionStats }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    if (!isImage(imageName)) {
      throw new BadRequestException(
        `"${imageName}" is not a supported image filename`,
      );
    }

    const imagePath = path.join(datasetPath, imageName);
    try {
      await fs.access(imagePath);
    } catch {
      throw new NotFoundException(
        `Image "${imageName}" not found in dataset "${name}"`,
      );
    }

    const captionPath = path.join(datasetPath, `${stem(imageName)}.txt`);
    await fs.writeFile(captionPath, caption, 'utf8');
    this.logger.debug(`Wrote caption: ${captionPath}`);

    return { captionPath, captionStats: this.computeCaptionStats(caption) };
  }

  /**
   * Delete a caption file for a given image.
   * Idempotent — returns { deleted: false } if already absent.
   */
  async deleteCaption(
    name: string,
    imageName: string,
  ): Promise<{ deleted: boolean }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    if (!isImage(imageName)) {
      throw new BadRequestException(
        `"${imageName}" is not a supported image filename`,
      );
    }

    const captionPath = path.join(datasetPath, `${stem(imageName)}.txt`);
    try {
      await fs.unlink(captionPath);
      this.logger.debug(`Deleted caption: ${captionPath}`);
      return { deleted: true };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { deleted: false };
      }
      throw err;
    }
  }

  /**
   * Bulk-prepend an activation token to all existing caption files.
   *
   * Modes:
   *   tag_list     → "token, <rest>"
   *   nl_prefix    → "token. <rest>"
   *   nl_style     → "In style of token, <rest>"
   *   nl_character → "token character, <rest>"
   *
   * @param skipExisting  Skip captions that already start with the token
   */
  async prependToken(
    name: string,
    token: string,
    mode: PrependMode,
    skipExisting: boolean,
  ): Promise<PrependTokenResult> {
    if (!token?.trim()) {
      throw new BadRequestException('Activation token must not be empty');
    }

    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const files = await fs.readdir(datasetPath);
    const imageFiles = files.filter(isImage);

    let updated = 0;
    let skipped = 0;
    let missing = 0;

    const normalizedToken = token.trim();

    for (const imageFile of imageFiles) {
      const captionPath = path.join(datasetPath, `${stem(imageFile)}.txt`);

      let existing: string | null = null;
      try {
        existing = (await fs.readFile(captionPath, 'utf8')).trim();
      } catch {
        missing++;
        continue;
      }

      if (
        skipExisting &&
        existing.toLowerCase().startsWith(normalizedToken.toLowerCase())
      ) {
        skipped++;
        continue;
      }

      const newCaption = this.buildPrependedCaption(normalizedToken, existing, mode);
      await fs.writeFile(captionPath, newCaption, 'utf8');
      updated++;
    }

    this.logger.log(
      `Dataset "${name}" prepend-token: updated=${updated} skipped=${skipped} missing=${missing}`,
    );

    return { updated, skipped, missing };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Read the DB metadata record for a dataset.
   * Returns null if no record has been created yet (e.g. manually placed dataset).
   * Throws NotFoundException if the dataset directory does not exist.
   */
  async getMeta(name: string): Promise<DatasetMeta | null> {
    await this.assertExists(name, this.datasetPath(name));
    return this.findMetaByName(name);
  }

  /**
   * Merge-update the DB metadata record.
   * Creates a new record with defaults if one doesn't exist yet.
   * Throws NotFoundException if the dataset directory does not exist.
   */
  async updateMeta(name: string, update: DatasetMetaUpdate): Promise<DatasetMeta> {
    await this.assertExists(name, this.datasetPath(name));

    const existing = await this.metaRepo.findOne({ where: { name } });

    if (existing) {
      // Strip undefined values so Object.assign doesn't overwrite with undefined
      const cleanUpdate = Object.fromEntries(
        Object.entries(update).filter(([, v]) => v !== undefined),
      );
      Object.assign(existing, cleanUpdate);
      const saved = await this.metaRepo.save(existing);
      return this.entityToMeta(saved);
    }

    // No record yet — create one seeded with the update
    const created = this.metaRepo.create({ name, ...update } as DeepPartial<DatasetMetadata>);
    const saved = await this.metaRepo.save(created);
    this.logger.log(`Created metadata record for dataset "${name}"`);
    return this.entityToMeta(saved);
  }

  /**
   * Sample caption files to determine their style, persist the result to DB,
   * and return detection stats alongside the updated metadata.
   */
  async detectCaptionType(name: string): Promise<CaptionTypeDetectionResult> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const files = await fs.readdir(datasetPath);
    const result = await this.detectCaptionTypeFromDir(files, datasetPath);

    // Persist detected type — updateMeta handles upsert
    const meta = await this.updateMeta(name, { captionType: result.captionType });

    return { ...result, meta };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Stream the dataset directory as a zip archive to the provided Response.
   * Includes images, captions and the DB metadata serialised as meta.json.
   * No temp file is created — streams directly.
   */
  async exportZip(name: string, res: import('express').Response): Promise<void> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const archive = archiver('zip', { zlib: { level: 6 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);

    archive.pipe(res);
    archive.directory(datasetPath, false);

    // Append DB metadata as a JSON sidecar so exports are self-describing
    const meta = await this.findMetaByName(name);
    if (meta) {
      archive.append(JSON.stringify(meta, null, 2), { name: 'dataset.meta.json' });
    }

    await archive.finalize();
    this.logger.log(`Exported dataset "${name}" as zip`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Delete a single image and its companion caption file (if present).
   * Throws NotFoundException if the image doesn't exist.
   */
  async deleteImage(
    name: string,
    filename: string,
  ): Promise<{ deleted: string[]; captionDeleted: boolean }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const safeFilename = path.basename(filename);
    if (!isImage(safeFilename)) {
      throw new BadRequestException(
        `"${safeFilename}" is not a supported image filename`,
      );
    }

    const imagePath = path.join(datasetPath, safeFilename);
    try {
      await fs.access(imagePath);
    } catch {
      throw new NotFoundException(
        `Image "${safeFilename}" not found in dataset "${name}"`,
      );
    }

    const deleted: string[] = [];

    await fs.unlink(imagePath);
    deleted.push(safeFilename);

    const captionPath = path.join(datasetPath, `${stem(safeFilename)}.txt`);
    let captionDeleted = false;
    try {
      await fs.unlink(captionPath);
      captionDeleted = true;
    } catch {
      // No companion caption — not an error
    }

    this.logger.debug(`Deleted image "${safeFilename}" from dataset "${name}"`);
    return { deleted, captionDeleted };
  }

  /**
   * Delete the entire dataset directory and its DB metadata record.
   * Throws NotFoundException if the directory doesn't exist.
   */
  async remove(name: string): Promise<{ deleted: boolean }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    await fs.rm(datasetPath, { recursive: true, force: true });
    this.logger.log(`Deleted dataset "${name}" at ${datasetPath}`);

    // Best-effort DB cleanup — don't throw if the record was never created
    try {
      await this.metaRepo.delete({ name });
      this.logger.debug(`Removed metadata record for dataset "${name}"`);
    } catch (err) {
      this.logger.warn(`Could not remove metadata for "${name}": ${err}`);
    }

    return { deleted: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNKED UPLOAD
  // ══════════════════════════════════════════════════════════════════════════

  async initChunkedUpload(): Promise<{ uploadId: string }> {
    const uploadId = randomUUID();
    await fs.mkdir(this.chunkTempDir(uploadId), { recursive: true });
    this.logger.debug(`Chunked upload session created: ${uploadId}`);
    return { uploadId };
  }

  async saveChunk(
    uploadId: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<{ uploadId: string; chunkIndex: number }> {
    const tempDir = this.chunkTempDir(uploadId);

    try {
      await fs.access(tempDir);
    } catch {
      throw new BadRequestException(
        `Upload session "${uploadId}" not found. Call /upload/chunked/init first.`,
      );
    }

    const chunkFilename = `chunk-${String(chunkIndex).padStart(8, '0')}`;
    await fs.writeFile(path.join(tempDir, chunkFilename), buffer);
    this.logger.debug(`Chunk ${chunkIndex} saved for session ${uploadId}`);

    return { uploadId, chunkIndex };
  }

  async completeChunkedUpload(
    uploadId: string,
    name: string,
    totalChunks: number,
    overwrite = true,
  ): Promise<UploadResult> {
    const tempDir = this.chunkTempDir(uploadId);

    try {
      await fs.access(tempDir);
    } catch {
      throw new BadRequestException(
        `Upload session "${uploadId}" not found or already completed.`,
      );
    }

    const assembledPath = path.join(tempDir, 'assembled.zip');
    const writeStream = fsSync.createWriteStream(assembledPath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${String(i).padStart(8, '0')}`);
      let chunkBuffer: Buffer;
      try {
        chunkBuffer = await fs.readFile(chunkPath);
      } catch {
        writeStream.destroy();
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        throw new BadRequestException(
          `Chunk ${i}/${totalChunks} missing from session "${uploadId}". Upload may be incomplete.`,
        );
      }
      writeStream.write(chunkBuffer);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', (err) => reject(err as Error));
    });

    let result: UploadResult;
    try {
      result = await this.extractZipFile(name, assembledPath, overwrite);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — filesystem helpers
  // ══════════════════════════════════════════════════════════════════════════

  private datasetPath(name: string): string {
    return path.join(this.paths.datasets, name);
  }

  private chunkTempDir(uploadId: string): string {
    return path.join(os.tmpdir(), 'gendojo-uploads', uploadId);
  }

  private async ensureDatasetsRoot(): Promise<void> {
    await fs.mkdir(this.paths.datasets, { recursive: true });
  }

  private async assertExists(name: string, fullPath: string): Promise<void> {
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        throw new NotFoundException(`Dataset "${name}" is not a directory`);
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException(`Dataset "${name}" not found`);
      }
      throw err;
    }
  }

  private async summarise(
    name: string,
    fullPath: string,
    mtime: Date,
    meta: DatasetMeta | null,
  ): Promise<DatasetSummary> {
    let files: string[] = [];
    try {
      files = await fs.readdir(fullPath);
    } catch {
      /* unreadable dir — return zero counts */
    }

    const imageFiles = files.filter(isImage);
    const captionStems = new Set(files.filter(isCaption).map((f) => stem(f)));
    const captionedCount = imageFiles.filter((f) => captionStems.has(stem(f))).length;

    return {
      name,
      path: fullPath,
      imageCount: imageFiles.length,
      captionedCount,
      captionCoverage: imageFiles.length > 0 ? captionedCount / imageFiles.length : 0,
      updatedAt: mtime.toISOString(),
      meta,
    };
  }

  /**
   * Extract zip buffer into datasetPath.
   * Strips one level of nesting when the archive contains a single top-level folder.
   * Returns per-type file counts and skipped entries.
   */
  private async extractZipBuffer(
    zipBuffer: Buffer,
    datasetPath: string,
  ): Promise<{ imageCount: number; captionCount: number; skippedFiles: string[] }> {
    const directory = await unzipper.Open.buffer(zipBuffer);
    return this.extractEntries(directory.files, datasetPath);
  }

  private async extractZipFile(
    name: string,
    zipPath: string,
    overwrite = true,
  ): Promise<UploadResult> {
    this.validateName(name);
    const datasetPath = this.datasetPath(name);

    if (!overwrite && fsSync.existsSync(datasetPath)) {
      throw new ConflictException(
        `Dataset "${name}" already exists. Pass overwrite=true to merge.`,
      );
    }

    const isNew = !fsSync.existsSync(datasetPath);
    await fs.mkdir(datasetPath, { recursive: true });

    const directory = await unzipper.Open.file(zipPath);
    const { imageCount, captionCount, skippedFiles } = await this.extractEntries(
      directory.files,
      datasetPath,
    );

    this.logger.log(
      `Dataset "${name}": extracted ${imageCount} images + ${captionCount} captions from file, skipped ${skippedFiles.length}`,
    );

    await this.upsertMetaAfterUpload(name, datasetPath, isNew);

    return {
      name,
      path: datasetPath,
      extractedFiles: imageCount + captionCount,
      imageCount,
      captionCount,
      skippedFiles,
    };
  }

  /**
   * Shared extraction logic for both buffer and file-based zip operations.
   * Strips one level of nesting when the archive has a single top-level folder.
   */
  private async extractEntries(
    entries: unzipper.File[],
    destDir: string,
  ): Promise<{ imageCount: number; captionCount: number; skippedFiles: string[] }> {
    const skippedFiles: string[] = [];
    let imageCount = 0;
    let captionCount = 0;

    // Detect single top-level folder → strip prefix for automatic flattening
    const topLevelDirs = new Set<string>();
    for (const entry of entries) {
      if (entry.type === 'Directory') continue;
      const parts = entry.path.split('/');
      if (parts.length > 1) topLevelDirs.add(parts[0]);
    }
    const stripPrefix = topLevelDirs.size === 1 ? [...topLevelDirs][0] + '/' : null;

    for (const entry of entries) {
      if (entry.type === 'Directory') continue;

      // Skip macOS and hidden junk
      if (
        entry.path.includes('__MACOSX') ||
        entry.path.includes('.DS_Store') ||
        path.basename(entry.path).startsWith('.')
      ) {
        continue;
      }

      let relativePath = entry.path;
      if (stripPrefix && relativePath.startsWith(stripPrefix)) {
        relativePath = relativePath.slice(stripPrefix.length);
      }

      // Skip files still nested after prefix stripping
      if (relativePath.includes('/')) {
        skippedFiles.push(entry.path);
        continue;
      }

      const basename = path.basename(relativePath);
      if (!isImage(basename) && !isCaption(basename)) {
        skippedFiles.push(basename);
        continue;
      }

      const destPath = path.join(destDir, basename);
      const readStream = entry.stream() as unknown as Readable;
      const writeStream = fsSync.createWriteStream(destPath);
      await pipeline(readStream, writeStream);

      if (isImage(basename)) imageCount++;
      else captionCount++;
    }

    return { imageCount, captionCount, skippedFiles };
  }

  private validateName(name: string): void {
    if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      throw new BadRequestException(
        `Invalid dataset name "${name}". Use only letters, numbers, hyphens, underscores.`,
      );
    }
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new BadRequestException('Dataset name must not contain path separators');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — DB helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Load a metadata record by dataset name.
   * Returns null if not found — never throws.
   */
  private async findMetaByName(name: string): Promise<DatasetMeta | null> {
    try {
      const record = await this.metaRepo.findOne({ where: { name } });
      return record ? this.entityToMeta(record) : null;
    } catch (err) {
      this.logger.warn(`Could not load metadata for "${name}": ${err}`);
      return null;
    }
  }

  /**
   * After an upload completes:
   * - New dataset: auto-detect caption type, create DB record with detected type
   * - Existing dataset: ensure a DB record exists (create defaults if missing)
   *
   * Safe to call multiple times — never overwrites user-edited metadata.
   */
  private async upsertMetaAfterUpload(
    name: string,
    datasetPath: string,
    isNew: boolean,
  ): Promise<void> {
    if (isNew) {
      const files = await fs.readdir(datasetPath);
      const detection = await this.detectCaptionTypeFromDir(files, datasetPath);
      const record = this.metaRepo.create({
        name,
        captionType: detection.captionType,
        has_captions: detection.sampleSize > 0,
      });
      await this.metaRepo.save(record);
      this.logger.debug(
        `Created metadata for new dataset "${name}" (captionType: ${detection.captionType})`,
      );
    } else {
      // Ensure a record exists for pre-existing datasets without one
      const existing = await this.metaRepo.findOne({ where: { name } });
      if (!existing) {
        const record = this.metaRepo.create({ name });
        await this.metaRepo.save(record);
        this.logger.debug(`Created default metadata record for existing dataset "${name}"`);
      }
    }
  }

  /**
   * Map a DatasetMetadata entity to the plain DatasetMeta interface.
   * Serialises Date columns to ISO strings.
   */
  private entityToMeta(entity: DatasetMetadata): DatasetMeta {
    return {
      description:       entity.description ?? null,
      activationToken:   entity.activationToken ?? null,
      captionType:       entity.captionType,
      type:              entity.type,
      resolution:        entity.resolution,
      keep_tokens_count: entity.keep_tokens_count,
      has_captions:      entity.has_captions,
      notes:             entity.notes ?? null,
      tagFrequency:      entity.tagFrequency,
      total_file_size:   entity.total_file_size,
      createdAt:         entity.created_at.toISOString(),
      updatedAt:         entity.updated_at.toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — caption analysis
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Compute lightweight caption length stats from a raw caption string.
   * Pure function — no I/O.
   */
  computeCaptionStats(text: string): CaptionStats {
    const trimmed = text.trim();
    const charCount = trimmed.length;
    const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

    return {
      charCount,
      wordCount,
      isLongForClip: charCount > CAPTION_LENGTH_THRESHOLDS.CLIP,
      isLongForT5: charCount > CAPTION_LENGTH_THRESHOLDS.T5,
    };
  }

  private computeCaptionLengthSummary(stats: CaptionStats[]): CaptionLengthSummary {
    const count = stats.length;
    const totalChars = stats.reduce((s, c) => s + c.charCount, 0);
    const totalWords = stats.reduce((s, c) => s + c.wordCount, 0);

    return {
      longForClipCount: stats.filter((c) => c.isLongForClip).length,
      longForT5Count:   stats.filter((c) => c.isLongForT5).length,
      avgCharCount:     Math.round(totalChars / count),
      avgWordCount:     Math.round(totalWords / count),
    };
  }

  /**
   * Sample up to DETECTION_SAMPLE_SIZE caption files and classify each.
   * Returns aggregate stats without writing to DB.
   */
  private async detectCaptionTypeFromDir(
    files: string[],
    datasetPath: string,
  ): Promise<Omit<CaptionTypeDetectionResult, 'meta'>> {
    const captionFiles = files.filter(isCaption);

    if (captionFiles.length === 0) {
      return { captionType: 'unknown', sampleSize: 0, tagListRatio: 0 };
    }

    const sample = captionFiles
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, DETECTION_SAMPLE_SIZE);

    let tagListCount = 0;
    for (const file of sample) {
      const text = await fs
        .readFile(path.join(datasetPath, file), 'utf8')
        .catch(() => '');
      if (this.looksLikeTagList(text)) tagListCount++;
    }

    const tagListRatio = tagListCount / sample.length;

    let captionType: CaptionType;
    if (tagListRatio >= TAG_LIST_THRESHOLD) {
      captionType = 'tag_list';
    } else if (tagListRatio <= MIXED_THRESHOLD) {
      captionType = 'natural_language';
    } else {
      captionType = 'mixed';
    }

    return { captionType, sampleSize: sample.length, tagListRatio };
  }

  /**
   * Heuristic: a caption looks like a tag list when it has ≥ 2 commas,
   * short average token length (< 25 chars), and few sentence-ending marks.
   */
  private looksLikeTagList(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const commaCount = (trimmed.match(/,/g) ?? []).length;
    if (commaCount < 2) return false;

    const tokens = trimmed.split(',').map((t) => t.trim()).filter(Boolean);
    const avgLen = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
    const sentenceEndings = (trimmed.match(/[.!?]/g) ?? []).length;

    return avgLen < 25 && sentenceEndings < 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — prepend helpers
  // ══════════════════════════════════════════════════════════════════════════

  private buildPrependedCaption(
    token: string,
    existing: string,
    mode: PrependMode,
  ): string {
    switch (mode) {
      case 'tag_list':
        return existing ? `${token}, ${existing}` : token;
      case 'nl_prefix':
        return existing ? `${token}. ${existing}` : token;
      case 'nl_style':
        return existing ? `In style of ${token}, ${existing}` : `In style of ${token}`;
      case 'nl_character':
        return existing ? `${token} character, ${existing}` : `${token} character`;
      default: {
        //const _exhaustive: never = mode;
        return existing;
      }
    }
  }
}