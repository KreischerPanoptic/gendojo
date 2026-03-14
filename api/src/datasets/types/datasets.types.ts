/**
 * Types for the Datasets module.
 *
 * A "dataset" in GenDojo terms is a directory under /workspace/datasets/<n>/
 * that contains training images (.jpg / .jpeg / .png / .webp) and optional
 * caption files (.txt with the same basename as the image).
 *
 * sd-scripts consumes this via image_dir in dataset.toml.
 *
 * Persisted metadata is stored in the `dataset_metas` SQLite table.
 * The filesystem is always the source of truth for images and captions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Caption type
// ─────────────────────────────────────────────────────────────────────────────

/** Detected or manually set style of caption files in the dataset */
export type CaptionType = 'tag_list' | 'natural_language' | 'mixed' | 'unknown';

/**
 * How to prepend an activation token to existing captions.
 *
 * tag_list      → "token, <rest of tags>"
 * nl_prefix     → "token. <rest of prompt>"
 * nl_style      → "In style of token, <rest of prompt>"
 * nl_character  → "token character, <rest of prompt>"
 */
export type PrependMode = 'tag_list' | 'nl_prefix' | 'nl_style' | 'nl_character';

/** Conceptual category of a dataset (informational — used for filtering in UI) */
export type DatasetType =
  | 'unknown'
  | 'style'
  | 'character'
  | 'object'
  | 'concept'
  | 'clothing';

// ─────────────────────────────────────────────────────────────────────────────
// Caption length stats
//
// Lightweight approximation — no tokenizer required.
// Actual token counts vary per architecture but correlate strongly with
// character length. Thresholds are intentionally conservative.
//
// Per-architecture soft limits (chars):
//   SD 1.x / 2.x / SDXL  → CLIP BPE, 77 tok  ≈ 200–250 chars
//   FLUX.1 / Chroma       → T5-XXL, 256 tok   ≈ 900–1100 chars
//   SD3 / SD3.5           → T5-XXL, 256 tok   ≈ 900–1100 chars
//   HunyuanImage          → mT5, 256 tok      ≈ 900–1100 chars
//   Lumina / Anima        → Gemma2/3, 2048 tok → practically unlimited
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approximate length thresholds for "may be truncated" warning.
 * Conservative — prefer false positives over missed truncations.
 */
export const CAPTION_LENGTH_THRESHOLDS = {
  /** CLIP-based architectures (SD1/2, SDXL component encoders) */
  CLIP: 200,
  /** T5 / mT5-based architectures (FLUX, SD3, Hunyuan) */
  T5: 900,
} as const;

/** Per-caption length statistics attached to each DatasetImage */
export interface CaptionStats {
  /** Number of UTF-8 characters in the caption */
  charCount: number;
  /** Approximate word count (whitespace-split) */
  wordCount: number;
  /**
   * True when charCount exceeds the CLIP threshold (200).
   * Most common truncation risk — flag prominently in the UI.
   */
  isLongForClip: boolean;
  /**
   * True when charCount exceeds the T5 threshold (900).
   * Relevant for FLUX / SD3 / Hunyuan training.
   */
  isLongForT5: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset metadata — stored in `dataset_metas` SQLite table (via TypeORM).
// The primary key is the dataset directory name.
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetMeta {
  /** Human-readable description of the dataset */
  description: string | null;
  /** Activation / trigger token for this concept */
  activationToken: string | null;
  /** Caption style — auto-detected on first upload or manually set */
  captionType: CaptionType;
  /** Conceptual category of the dataset */
  type: DatasetType;
  /** Target training resolution in pixels (informational) */
  resolution: number;
  /** Number of leading caption tokens to never shuffle */
  keep_tokens_count: number;
  /** Whether any caption files were found on last scan */
  has_captions: boolean;
  /** Optional free-form notes */
  notes: string | null;
  /** Tag → occurrence count, from caption analysis */
  tagFrequency: Record<string, number> | null;
  /** Total byte size of all dataset files (cached on upload) */
  total_file_size: number;
  /** ISO timestamp — when this metadata record was first created */
  createdAt: string;
  /** ISO timestamp — when this metadata record was last updated */
  updatedAt: string;
}

/**
 * Fields that can be changed via PATCH /datasets/:name/meta.
 * Excludes system-managed fields (createdAt, updatedAt, has_captions,
 * total_file_size) that are set by internal service logic only.
 */
export type DatasetMetaUpdate = Partial<
  Pick<
    DatasetMeta,
    | 'activationToken'
    | 'captionType'
    | 'description'
    | 'type'
    | 'resolution'
    | 'keep_tokens_count'
    | 'notes'
    | 'tagFrequency'
  >
>;

// ─────────────────────────────────────────────────────────────────────────────
// Image file record
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetImage {
  /** Filename only, e.g. "my_char_001.jpg" */
  filename: string;
  /** Absolute path on disk */
  path: string;
  /** File size in bytes */
  sizeBytes: number;
  /** True if a matching .txt caption file exists */
  hasCaption: boolean;
  /**
   * Caption length stats — null when hasCaption is false.
   * Populated on getOne(); not included in list() summaries for performance.
   */
  captionStats: CaptionStats | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset summary (returned by GET /datasets)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetSummary {
  /** Directory name — used as identifier in all API calls */
  name: string;
  /** Absolute path on disk, e.g. /workspace/datasets/my_char */
  path: string;
  /** Total number of supported image files */
  imageCount: number;
  /** Number of images that have a matching .txt caption file */
  captionedCount: number;
  /** Caption coverage fraction 0.0–1.0 */
  captionCoverage: number;
  /** ISO timestamp of last directory modification */
  updatedAt: string;
  /** Persisted metadata from DB — null when no record exists yet */
  meta: DatasetMeta | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset detail (returned by GET /datasets/:name)
// ─────────────────────────────────────────────────────────────────────────────

/** Aggregate caption length stats across all captioned images in a dataset */
export interface CaptionLengthSummary {
  /** Number of captioned images where charCount > CLIP threshold (200) */
  longForClipCount: number;
  /** Number of captioned images where charCount > T5 threshold (900) */
  longForT5Count: number;
  /** Average char count across all captioned images (rounded) */
  avgCharCount: number;
  /** Average word count across all captioned images (rounded) */
  avgWordCount: number;
}

export interface DatasetDetail extends DatasetSummary {
  images: DatasetImage[];
  /** Aggregate caption length stats — null if no captions present */
  captionLengthSummary: CaptionLengthSummary | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload result
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResult {
  name: string;
  path: string;
  /** Total files written (images + captions) */
  extractedFiles: number;
  /** Number of supported image files found */
  imageCount: number;
  /** Number of caption files found */
  captionCount: number;
  /** Files that were skipped (unsupported extension or nested path) */
  skippedFiles: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption detection result
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptionTypeDetectionResult {
  captionType: CaptionType;
  /** Number of caption files sampled */
  sampleSize: number;
  /** Fraction of sampled captions classified as tag-list style (0.0–1.0) */
  tagListRatio: number;
  /** Updated metadata after persisting the detected type */
  meta: DatasetMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepend token result
// ─────────────────────────────────────────────────────────────────────────────

export interface PrependTokenResult {
  /** Number of caption files that were updated */
  updated: number;
  /** Number of caption files that already contained the token (skipped) */
  skipped: number;
  /** Number of images that had no caption file at all (not touched) */
  missing: number;
}