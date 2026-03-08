/**
 * Types for the Datasets module.
 *
 * A "dataset" in GenDojo terms is a directory under /workspace/datasets/<name>/
 * that contains training images (.jpg / .jpeg / .png / .webp) and optional
 * caption files (.txt with the same basename as the image).
 *
 * sd-scripts consumes this via image_dir in dataset.toml.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Image file record
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetImage {
  /** Filename only, e.g. "my_char_001.jpg" */
  filename: string;
  /** Absolute path */
  path: string;
  /** File size in bytes */
  sizeBytes: number;
  /** True if a matching .txt caption file exists */
  hasCaption: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset summary (returned by GET /datasets)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetSummary {
  /** Directory name (used as identifier) */
  name: string;
  /** Absolute path on disk, e.g. /workspace/datasets/my_char */
  path: string;
  /** Total number of supported image files */
  imageCount: number;
  /** Number of images that have a matching .txt caption file */
  captionedCount: number;
  /** Caption coverage 0.0–1.0 */
  captionCoverage: number;
  /** ISO timestamp of last modification */
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset detail (returned by GET /datasets/:name)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetDetail extends DatasetSummary {
  images: DatasetImage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload result
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResult {
  name: string;
  path: string;
  /** Total files extracted from the zip */
  extractedFiles: number;
  /** Number of supported image files found after extraction */
  imageCount: number;
  /** Number of caption files found */
  captionCount: number;
  /** Files that were skipped (unsupported extension) */
  skippedFiles: string[];
}