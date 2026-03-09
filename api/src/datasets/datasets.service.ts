import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

import { PathsConfig } from '../config/paths.config';
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
} from './entities/dataset-info.types';
import { isCaption, isImage, stem } from 'src/utils/dataset';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const META_FILENAME = 'dataset.meta.json';

/** Max captions to sample for caption-type detection */
const DETECTION_SAMPLE_SIZE = 30;

/** Fraction of sample ≥ this → tag_list */
const TAG_LIST_THRESHOLD = 0.6;
/** Fraction of sample ≤ this → natural_language (everything between is mixed) */
const MIXED_THRESHOLD = 0.2;

// ─────────────────────────────────────────────────────────────────────────────
// DatasetsService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(private readonly paths: PathsConfig) {}

  // ══════════════════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Scan the datasets root and return a summary for each subdirectory.
   * Non-directory entries are ignored.
   * NOTE: summaries do NOT include per-image captionStats for performance.
   */
  async list(): Promise<DatasetSummary[]> {
    await this.ensureDatasetsRoot();

    let entries: string[];
    try {
      entries = await fs.readdir(this.paths.datasets);
    } catch {
      return [];
    }

    const results: DatasetSummary[] = [];

    for (const entry of entries) {
      const fullPath = path.join(this.paths.datasets, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) continue;

        const summary = await this.summarise(entry, fullPath, stat.mtime);
        results.push(summary);
      } catch {
        // Inaccessible directory — skip
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
      files.filter(isCaption).map(f => stem(f)),
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

    images.sort((a, b) => a.filename.localeCompare(b.filename));

    const captionedImages = images.filter(i => i.hasCaption);
    const captionedCount = captionedImages.length;
    const meta = await this.readMeta(datasetPath);

    const captionLengthSummary: CaptionLengthSummary | null =
      captionedCount > 0
        ? this.computeCaptionLengthSummary(
            captionedImages.map(i => i.captionStats!),
          )
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
   * - Flattens one level of directory nesting (common when users zip a folder)
   * - Skips __MACOSX, .DS_Store and other junk
   * - Merges files on conflict unless overwrite=false (throws 409)
   * - Auto-detects caption type after extraction and persists to meta
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

    const skippedFiles: string[] = [];
    let extractedFiles = 0;

    const directory = await unzipper.Open.buffer(zipBuffer);

    // Detect single top-level folder and strip it
    const topLevelDirs = new Set<string>();
    for (const entry of directory.files) {
      if (entry.type === 'Directory') continue;
      const parts = entry.path.split('/');
      if (parts.length > 1) topLevelDirs.add(parts[0]);
    }
    const stripPrefix =
      topLevelDirs.size === 1 ? [...topLevelDirs][0] + '/' : null;

    for (const entry of directory.files) {
      if (entry.type === 'Directory') continue;

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

      // Only keep files directly in root of the flattened structure
      // (no subdirectory support — sd-scripts reads a flat dir)
      if (relativePath.includes('/')) {
        skippedFiles.push(entry.path);
        continue;
      }

      const basename = path.basename(relativePath);
      if (!isImage(basename) && !isCaption(basename)) {
        skippedFiles.push(basename);
        continue;
      }

      const destPath = path.join(datasetPath, basename);
      const readStream = entry.stream() as unknown as Readable;
      const writeStream = fsSync.createWriteStream(destPath);
      await pipeline(readStream, writeStream);
      extractedFiles++;
    }

    this.logger.log(
      `Dataset "${name}": extracted ${extractedFiles} files, skipped ${skippedFiles.length}`,
    );

    // Auto-detect caption type and initialise meta for new datasets
    if (isNew) {
      const detected = await this.detectCaptionTypeFromDir(
        await fs.readdir(datasetPath),
        datasetPath,
      );
      const existing = await this.readMeta(datasetPath);
      await this.writeMeta(datasetPath, {
        ...(existing ?? this.defaultMeta()),
        captionType: detected.captionType,
      });
    }

    const detail = await this.getOne(name);

    return {
      name,
      path: datasetPath,
      extractedFiles,
      imageCount: detail.imageCount,
      captionCount: detail.captionedCount,
      skippedFiles,
    };
  }

  /**
   * Upload individual image/caption files (multipart) to a dataset.
   * Creates the dataset directory if it doesn't exist.
   */
  async uploadFiles(
    name: string,
    files: Express.Multer.File[],
  ): Promise<UploadResult> {
    this.validateName(name);
    const datasetPath = this.datasetPath(name);
    await fs.mkdir(datasetPath, { recursive: true });

    const skippedFiles: string[] = [];
    let extractedFiles = 0;

    for (const file of files) {
      const originalName = file.originalname;
      if (!isImage(originalName) && !isCaption(originalName)) {
        skippedFiles.push(originalName);
        continue;
      }
      const destPath = path.join(datasetPath, path.basename(originalName));
      await fs.writeFile(destPath, file.buffer);
      extractedFiles++;
    }

    this.logger.log(
      `Dataset "${name}": saved ${extractedFiles} files via multipart, skipped ${skippedFiles.length}`,
    );

    const detail = await this.getOne(name);

    return {
      name,
      path: datasetPath,
      extractedFiles,
      imageCount: detail.imageCount,
      captionCount: detail.captionedCount,
      skippedFiles,
    };
  }

  /**
   * Replace a single image in the dataset.
   * Caption is preserved. Extension of incoming file must match target filename.
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
   * Returns { caption: string, captionStats } or { caption: null, captionStats: null }.
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
    if (!token || !token.trim()) {
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

  /** Read dataset.meta.json. Returns null if absent. */
  async getMeta(name: string): Promise<DatasetMeta | null> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);
    return this.readMeta(datasetPath);
  }

  /** Merge-update dataset.meta.json. Creates it if absent. */
  async updateMeta(
    name: string,
    update: DatasetMetaUpdate,
  ): Promise<DatasetMeta> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const existing = (await this.readMeta(datasetPath)) ?? this.defaultMeta();
    const updated: DatasetMeta = { ...existing, ...update };
    await this.writeMeta(datasetPath, updated);

    return updated;
  }

  /**
   * Analyse caption files to determine their style.
   * Persists result into dataset.meta.json and returns detection details.
   */
  async detectCaptionType(name: string): Promise<CaptionTypeDetectionResult> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const files = await fs.readdir(datasetPath);
    const result = await this.detectCaptionTypeFromDir(files, datasetPath);

    const existing = (await this.readMeta(datasetPath)) ?? this.defaultMeta();
    const meta = await this.writeMeta(datasetPath, {
      ...existing,
      captionType: result.captionType,
    });

    return { ...result, meta };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Stream the dataset directory as a zip archive to the provided Response.
   * Includes images, captions and dataset.meta.json. No temp file needed.
   */
  async exportZip(name: string, res: import('express').Response): Promise<void> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    const archive = archiver('zip', { zlib: { level: 6 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);

    archive.pipe(res);
    archive.directory(datasetPath, false);

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
      // Not an error if absent
    }

    this.logger.debug(`Deleted image "${safeFilename}" from dataset "${name}"`);
    return { deleted, captionDeleted };
  }

  /**
   * Delete a dataset directory and all its contents.
   * Throws NotFoundException if it doesn't exist.
   */
  async remove(name: string): Promise<{ deleted: boolean }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    await fs.rm(datasetPath, { recursive: true, force: true });
    this.logger.log(`Deleted dataset "${name}" at ${datasetPath}`);

    return { deleted: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — filesystem helpers
  // ══════════════════════════════════════════════════════════════════════════

  private datasetPath(name: string): string {
    return path.join(this.paths.datasets, name);
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
  ): Promise<DatasetSummary> {
    let files: string[] = [];
    try {
      files = await fs.readdir(fullPath);
    } catch {
      /* unreadable dir */
    }

    const imageFiles = files.filter(isImage);
    const captionStems = new Set(files.filter(isCaption).map(f => stem(f)));
    const captionedCount = imageFiles.filter(f => captionStems.has(stem(f))).length;
    const meta = await this.readMeta(fullPath);

    return {
      name,
      path: fullPath,
      imageCount: imageFiles.length,
      captionedCount,
      captionCoverage:
        imageFiles.length > 0 ? captionedCount / imageFiles.length : 0,
      updatedAt: mtime.toISOString(),
      meta,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — meta helpers
  // ══════════════════════════════════════════════════════════════════════════

  private metaPath(datasetPath: string): string {
    return path.join(datasetPath, META_FILENAME);
  }

  private defaultMeta(): DatasetMeta {
    return {
      activationToken: null,
      captionType: 'unknown',
      notes: '',
      createdAt: new Date().toISOString(),
    };
  }

  private async readMeta(datasetPath: string): Promise<DatasetMeta | null> {
    try {
      const raw = await fs.readFile(this.metaPath(datasetPath), 'utf8');
      return JSON.parse(raw) as DatasetMeta;
    } catch {
      return null;
    }
  }

  private async writeMeta(
    datasetPath: string,
    meta: DatasetMeta,
  ): Promise<DatasetMeta> {
    await fs.writeFile(
      this.metaPath(datasetPath),
      JSON.stringify(meta, null, 2),
      'utf8',
    );
    return meta;
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

  private computeCaptionLengthSummary(
    stats: CaptionStats[],
  ): CaptionLengthSummary {
    const count = stats.length;
    const totalChars = stats.reduce((s, c) => s + c.charCount, 0);
    const totalWords = stats.reduce((s, c) => s + c.wordCount, 0);

    return {
      longForClipCount: stats.filter(c => c.isLongForClip).length,
      longForT5Count: stats.filter(c => c.isLongForT5).length,
      avgCharCount: Math.round(totalChars / count),
      avgWordCount: Math.round(totalWords / count),
    };
  }

  /**
   * Sample up to DETECTION_SAMPLE_SIZE caption files and classify each.
   * Returns aggregate stats without persisting to meta.
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
   * Heuristic: a caption looks like a tag list if it has ≥ 2 commas and
   * avg token length < 25 chars. Natural language captions have long clauses
   * and sentence-ending punctuation.
   */
  private looksLikeTagList(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const commaCount = (trimmed.match(/,/g) ?? []).length;
    if (commaCount < 2) return false;

    const tokens = trimmed.split(',').map(t => t.trim()).filter(Boolean);
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
        return existing
          ? `In style of ${token}, ${existing}`
          : `In style of ${token}`;
      case 'nl_character':
        return existing
          ? `${token} character, ${existing}`
          : `${token} character`;
      default: {
        const _exhaustive: never = mode;
        return existing;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE — validation
  // ══════════════════════════════════════════════════════════════════════════

  private validateName(name: string): void {
    if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      throw new BadRequestException(
        `Invalid dataset name "${name}". Use only letters, numbers, hyphens, underscores.`,
      );
    }
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new BadRequestException(
        `Dataset name must not contain path separators`,
      );
    }
  }
}