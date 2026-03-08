import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { PathsConfig } from '../config/paths.config';
import type {
  DatasetSummary,
  DatasetDetail,
  DatasetImage,
  UploadResult,
} from './entities/dataset-info.types';
import { isCaption, isImage, stem } from 'src/utils/dataset';
import { SkipAuth } from 'src/auth/skip-auth.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// DatasetsService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(private readonly paths: PathsConfig) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Scan the datasets root and return a summary for each subdirectory.
   * Non-directory entries are ignored.
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
   * Return full detail (including image list) for a named dataset.
   * Throws NotFoundException if the directory doesn't exist.
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
      images.push({
        filename: file,
        path: filePath,
        sizeBytes: fileStat.size,
        hasCaption: captionStems.has(stem(file)),
      });
    }

    images.sort((a, b) => a.filename.localeCompare(b.filename));

    const captionedCount = images.filter(i => i.hasCaption).length;

    return {
      name,
      path: datasetPath,
      imageCount: images.length,
      captionedCount,
      captionCoverage: images.length > 0 ? captionedCount / images.length : 0,
      updatedAt: stat.mtime.toISOString(),
      images,
    };
  }

  /**
   * Extract a zip archive into /workspace/datasets/<name>/.
   *
   * - Flattens one level of directory nesting (common when users zip a folder)
   * - Skips __MACOSX, .DS_Store and other junk
   * - If the dataset directory already exists, merges files (overwrites on
   *   conflict) unless `overwrite` is false, in which case throws 409.
   *
   * @param name      Target dataset name (alphanumeric + hyphen/underscore)
   * @param zipBuffer Buffer containing the zip file
   * @param overwrite Whether to merge into existing dataset (default true)
   */
  async uploadZip(
    name: string,
    zipBuffer: Buffer,
    overwrite = true,
  ): Promise<UploadResult> {
    this.validateName(name);
    const datasetPath = this.datasetPath(name);

    // 409 if dir exists and overwrite is false
    if (!overwrite && fsSync.existsSync(datasetPath)) {
      throw new ConflictException(
        `Dataset "${name}" already exists. Pass overwrite=true to merge.`,
      );
    }

    await fs.mkdir(datasetPath, { recursive: true });

    const skippedFiles: string[] = [];
    let extractedFiles = 0;

    // Parse zip in-memory
    const directory = await unzipper.Open.buffer(zipBuffer);

    // Detect single top-level folder (e.g. user zipped "my_char/" folder)
    // In that case strip the leading path component so files land flat.
    const topLevelDirs = new Set<string>();
    for (const entry of directory.files) {
      if (entry.type === 'Directory') continue;
      const parts = entry.path.split('/');
      if (parts.length > 1) topLevelDirs.add(parts[0]);
    }
    const stripPrefix =
      topLevelDirs.size === 1
        ? [...topLevelDirs][0] + '/'
        : null;

    for (const entry of directory.files) {
      if (entry.type === 'Directory') continue;

      // Strip common junk
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

    // Re-scan to get accurate counts
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
   * Write (or overwrite) a single caption file.
   * The target image must already exist in the dataset.
   *
   * @param name      Dataset name
   * @param imageName Image filename (e.g. "cat_001.jpg")
   * @param caption   Caption text content
   */
  async upsertCaption(
    name: string,
    imageName: string,
    caption: string,
  ): Promise<{ captionPath: string }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    if (!isImage(imageName)) {
      throw new BadRequestException(`"${imageName}" is not a supported image filename`);
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

    return { captionPath };
  }

  /**
   * Upload individual image files (multipart) to an existing or new dataset.
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

  /**
   * Read the caption text for a given image.
   * Returns { caption: string } if the .txt file exists, or { caption: null } if it doesn't.
   * Does NOT throw 404 when caption is missing — absence is a valid state.
   *
   * @param name      Dataset name
   * @param imageName Image filename (e.g. "cat_001.jpg")
   */
  async getCaption(
    name: string,
    imageName: string,
  ): Promise<{ caption: string | null }> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);

    if (!isImage(imageName)) {
      throw new BadRequestException(`"${imageName}" is not a supported image filename`);
    }

    const captionPath = path.join(datasetPath, `${stem(imageName)}.txt`);
    try {
      const text = await fs.readFile(captionPath, 'utf8');
      return { caption: text.trim() };
    } catch {
      return { caption: null };
    }
  }

  /**
   * Resolve the absolute path to an image file inside a dataset.
   * Used by the controller to serve image files directly.
   * Validates that the dataset directory exists before returning the path.
   */
  @SkipAuth()
  async resolveImagePath(name: string, filename: string): Promise<string> {
    const datasetPath = this.datasetPath(name);
    await this.assertExists(name, datasetPath);
    return path.join(datasetPath, filename);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

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

    return {
      name,
      path: fullPath,
      imageCount: imageFiles.length,
      captionedCount,
      captionCoverage:
        imageFiles.length > 0 ? captionedCount / imageFiles.length : 0,
      updatedAt: mtime.toISOString(),
    };
  }

  /**
   * Dataset names must be safe for use as filesystem paths.
   * Allowed: alphanumeric, hyphen, underscore, dot (no leading dot).
   */
  private validateName(name: string): void {
    if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      throw new BadRequestException(
        `Invalid dataset name "${name}". Use only letters, numbers, hyphens, underscores.`,
      );
    }
    // Prevent path traversal
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new BadRequestException(`Dataset name must not contain path separators`);
    }
  }
}