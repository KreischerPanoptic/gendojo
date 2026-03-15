/**
 * DTOs for generating dataset.toml consumed by --dataset_config.
 *
 * Structure follows config_README-en.md exactly:
 *   [general]              → GeneralDto
 *   [[datasets]]           → DatasetDto  (resolution + bucket settings live here)
 *     [[datasets.subsets]] → SubsetDto   (image_dir, repeats, per-image options)
 *
 * Precedence (sd-scripts): subset > dataset > general.
 *
 * Method detection: sd-scripts determines DreamBooth vs fine-tuning from the
 * PRESENCE of `metadata_file` in a subset.  All subsets in the same dataset
 * must use the same method.  To mix methods, define separate [[datasets]].
 *
 * NOTE: These are TypeScript interfaces (not NestJS classes) because
 * they are used as discriminated union types that cannot be cleanly expressed
 * with class-transformer / @ApiProperty decorators.
 * Swagger schema is defined inline in TomlController via @ApiBody.
 */

import type { SubsetLevelOptions } from '../types/dataset-toml.types';

// ─────────────────────────────────────────────────────────────────────────────
// [[datasets.subsets]] — DreamBooth method
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DreamBooth-style subset.
 *
 * Detected at runtime by sd-scripts when `metadata_file` is absent.
 * Images must be placed DIRECTLY inside `image_dir` (no subdirectories).
 *
 * All fields from SubsetLevelOptions (shuffle_caption, flip_aug, etc.)
 * are also valid here — see dataset-toml.types.ts for the full list.
 */
export interface DreamBoothSubsetDto extends SubsetLevelOptions {
  /**
   * Absolute path to the directory containing training images.
   * Images must be placed directly inside — subdirectories are not scanned.
   * Required for DreamBooth subsets.
   * @example "/workspace/datasets/my_char"
   */
  image_dir: string;

  /**
   * Class tokens used as caption fallback when no caption file exists for an image.
   * sd-scripts errors at startup if `class_tokens` is absent AND no caption file is found.
   * Irrelevant when every image has a paired .txt file.
   * @example "my char"
   */
  class_tokens?: string;

  /**
   * Whether these images are regularisation (prior preservation) images.
   * Regularisation images are weighted differently to prevent language drift.
   * Default: false (training images).
   */
  is_reg?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// [[datasets.subsets]] — Fine-tuning method
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fine-tuning style subset.
 *
 * Detected at runtime by sd-scripts from the presence of `metadata_file`.
 * Captions are read from the JSON metadata file rather than from .txt sidecar files.
 *
 * All fields from SubsetLevelOptions (shuffle_caption, flip_aug, etc.)
 * are also valid here — see dataset-toml.types.ts for the full list.
 */
export interface FineTuningSubsetDto extends SubsetLevelOptions {
  /**
   * Path to the JSON metadata file for this subset.
   * Equivalent to the CLI argument --in_json.
   * Required — its presence is what makes sd-scripts use fine-tuning mode.
   * @example "/workspace/datasets/my_char/metadata.json"
   */
  metadata_file: string;

  /**
   * Absolute path to the image directory.
   * Optional when the metadata file was generated with --full_path (paths are
   * embedded in the metadata).  Strongly recommended otherwise.
   * @example "/workspace/datasets/my_char"
   */
  image_dir?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Union — sd-scripts determines method from presence of metadata_file
// ─────────────────────────────────────────────────────────────────────────────

/** DreamBooth OR fine-tuning subset — method determined by presence of metadata_file */
export type SubsetDto = DreamBoothSubsetDto | FineTuningSubsetDto;

// ─────────────────────────────────────────────────────────────────────────────
// [[datasets]]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [[datasets]] section — one entry per dataset.
 *
 * Options here apply to all subsets in this dataset and override [general].
 * Subsets within the same dataset share resolution and batch_size.
 * To train with different resolutions, define separate [[datasets]] entries.
 *
 * All subset-level options (shuffle_caption, flip_aug, caption_extension, etc.)
 * from SubsetLevelOptions are also valid here.
 */
export interface DatasetDto extends SubsetLevelOptions {
  /**
   * At least one subset must be defined per dataset.
   * Subsets in the same dataset must all use the same method
   * (all DreamBooth OR all fine-tuning — mixing is not allowed within one dataset).
   */
  subsets: SubsetDto[];

  // ── Resolution / bucketing ─────────────────────────────────────────────────

  /**
   * Training resolution in pixels.
   *   Single integer  → square crop  (e.g. 1024 → 1024×1024)
   *   [width, height] → rectangular  (e.g. [1216, 832])
   *
   * Required unless specified in [general].
   * Aspect Ratio Bucketing (enable_bucket) lets the model see non-square images
   * at the cost of slight padding artifacts.
   * @example 1024
   * @example [1216, 832]
   */
  resolution?: number | [number, number];

  /**
   * Training batch size for this dataset.
   * Equivalent to --train_batch_size.
   * Effective batch = batch_size × gradient_accumulation_steps.
   * Larger values → faster training but more VRAM.
   * @example 1
   */
  batch_size?: number;

  /**
   * Enable Aspect Ratio Bucketing (ARB).
   * When true, images are grouped into resolution buckets so images of similar
   * aspect ratios are trained together.  Avoids squashing non-square images.
   * Requires min_bucket_reso and max_bucket_reso to be set.
   * @example true
   */
  enable_bucket?: boolean;

  /**
   * Minimum bucket resolution in pixels.
   * Must be divisible by bucket_reso_steps (default 64).
   * Images smaller than this are upscaled to fit the smallest bucket.
   * @example 256
   */
  min_bucket_reso?: number;

  /**
   * Maximum bucket resolution in pixels.
   * Must be divisible by bucket_reso_steps (default 64).
   * Images larger than this are downscaled.
   * @example 2048
   */
  max_bucket_reso?: number;

  /**
   * Step size for bucket resolution generation.
   * Controls the granularity of bucket sizes between min and max.
   * Must be a multiple of 32 for SDXL.
   * Default: 64.  32 also works for SDXL with finer bucketing.
   * @example 64
   */
  bucket_reso_steps?: number;

  /**
   * Do not upscale images smaller than the bucket resolution.
   * When true, small images are padded instead of stretched.
   * Default: false (images are upscaled to fit their bucket).
   * @example false
   */
  bucket_no_upscale?: boolean;

  // ── Interpolation ──────────────────────────────────────────────────────────

  /**
   * Interpolation method used when resizing dataset images to training resolution.
   *
   * Applies during data loading, not during training.
   * Can also be specified at [general] or [[datasets.subsets]] level.
   * Default when unspecified: area for downscaling, lanczos for upscaling.
   *
   * Note: this field name matches FLUX docs (interpolation_type); in the subset
   * shared options the same option is called resize_interpolation.
   * @example "bicubic"
   */
  interpolation_type?: 'bicubic' | 'bilinear' | 'lanczos' | 'nearest' | 'area';

  // ── Validation ─────────────────────────────────────────────────────────────

  /**
   * Seed used for reproducible shuffling of validation data.
   * Only relevant when validation_split > 0.
   * @example 42
   */
  validation_seed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// [general]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [general] section — defaults that apply to all datasets and subsets.
 *
 * Any option specified here can be overridden at the [[datasets]] level,
 * and further overridden at the [[datasets.subsets]] level.
 *
 * Accepts exactly the same fields as DatasetDto minus `subsets`.
 * Typical use: set shuffle_caption, caption_extension, enable_bucket globally,
 * then override resolution per dataset.
 */
export type GeneralDto = Omit<DatasetDto, 'subsets'>;

// ─────────────────────────────────────────────────────────────────────────────
// Root DTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Root structure for dataset.toml passed to --dataset_config.
 *
 * @example Minimal DreamBooth config:
 * {
 *   datasets: [{
 *     resolution: 1024,
 *     enable_bucket: true,
 *     subsets: [{ image_dir: "/workspace/datasets/my_char", num_repeats: 10 }]
 *   }]
 * }
 *
 * @example Mixed resolution DreamBooth + fine-tuning:
 * {
 *   general: { shuffle_caption: true, caption_extension: ".txt" },
 *   datasets: [
 *     { resolution: 512,  subsets: [{ image_dir: "/data/sd1_style" }] },
 *     { resolution: 1024, subsets: [{ image_dir: "/data/ft", metadata_file: "/data/ft/meta.json" }] }
 *   ]
 * }
 */
export interface DatasetTomlDto {
  /**
   * Global defaults for all datasets and subsets.
   * Optional — omit when every dataset has its own settings.
   */
  general?: GeneralDto;

  /**
   * One or more dataset definitions.
   * At least one dataset is required.
   * Different datasets can have different resolutions and batch sizes.
   */
  datasets: DatasetDto[];
}