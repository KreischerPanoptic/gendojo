/**
 * DTOs for generating dataset.toml consumed by --dataset_config.
 *
 * Structure follows config_README-en.md exactly:
 *   [general]            → GeneralDto
 *   [[datasets]]         → DatasetDto  (resolution, bucket settings live here)
 *     [[datasets.subsets]] → SubsetDto (image_dir, num_repeats, per-image options)
 *
 * Precedence: subset > dataset > general  (sd-scripts own rule)
 */

import { SubsetLevelOptions } from "../entities/dataset-toml.types";

// ─────────────────────────────────────────────────────────────────────────────
// [[datasets.subsets]]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DreamBooth-style subset.
 * Determined by the presence of image_dir WITHOUT metadata_file.
 */
export interface DreamBoothSubsetDto extends SubsetLevelOptions {
  /** Absolute path to the image directory. Images must be directly inside. */
  image_dir: string;
  /** File extension for caption files; e.g. ".txt" */
  caption_extension?: string;
  /**
   * Class tokens used when no caption file exists for an image.
   * If omitted and no caption file is found, sd-scripts will error.
   */
  class_tokens?: string;
  /** Whether these images are regularisation (prior preservation) images */
  is_reg?: boolean;
  /**
   * Cache image size and caption in metadata_cache.json.
   * Speeds up repeated dataset loading. Default false.
   */
  cache_info?: boolean;
  // ── Masked loss ────────────────────────────────────────────────────────────
  /**
   * Directory containing mask images (same basename as training images).
   * White = train, black = ignore.  Also used by ControlNet-LLLite.
   */
  conditioning_data_dir?: string;
  /** Use the image's alpha channel as a mask instead of conditioning_data_dir */
  alpha_mask?: boolean;
}

/**
 * Fine-tuning style subset.
 * Determined by the presence of metadata_file.
 */
export interface FineTuningSubsetDto extends SubsetLevelOptions {
  /**
   * Path to the metadata JSON file.
   * Required for fine-tuning method. Equivalent to --in_json.
   */
  metadata_file: string;
  /**
   * Path to image directory.
   * Not strictly required if metadata was generated with --full_path,
   * but strongly recommended.
   */
  image_dir?: string;
}

/** Union — sd-scripts determines method from presence of metadata_file */
export type SubsetDto = DreamBoothSubsetDto | FineTuningSubsetDto;

// ─────────────────────────────────────────────────────────────────────────────
// [[datasets]]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options that are dataset-scoped (cannot appear inside [[datasets.subsets]]).
 * All subset-level options are also valid here.
 */
export interface DatasetDto extends SubsetLevelOptions {
  // ── Required ───────────────────────────────────────────────────────────────
  /** At least one subset is required */
  subsets: SubsetDto[];

  // ── Resolution / bucketing ─────────────────────────────────────────────────
  /**
   * Training resolution.
   * Single integer → square (e.g. 512).
   * Tuple [width, height] → rectangular (e.g. [1024, 768]).
   */
  resolution?: number | [number, number];
  /** Training batch size for this dataset (≡ --train_batch_size) */
  batch_size?: number;
  /** Enable Aspect Ratio Bucketing */
  enable_bucket?: boolean;
  /** Minimum bucket resolution; must be divisible by bucket_reso_steps */
  min_bucket_reso?: number;
  /** Maximum bucket resolution; must be divisible by bucket_reso_steps */
  max_bucket_reso?: number;
  /**
   * Resolution step for bucket generation.
   * Must be a multiple of 32 for SDXL.
   * Default 64; 32 also works for SDXL.
   */
  bucket_reso_steps?: number;
  /** Do not upscale images smaller than the bucket resolution */
  bucket_no_upscale?: boolean;

  // ── Interpolation override (documented in flux_train_network.md §7.2) ───────
  /**
   * Interpolation method when resizing dataset images to training resolution.
   * Available: bicubic (default), bilinear, lanczos, nearest, area.
   * Can also be specified at [general] or [[datasets.subsets]] level.
   */
  interpolation_type?: 'bicubic' | 'bilinear' | 'lanczos' | 'nearest' | 'area';

  // ── Validation ─────────────────────────────────────────────────────────────
  /** Seed used for shuffling validation data */
  validation_seed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// [general]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [general] section — applies to all datasets and subsets unless overridden.
 * Accepts the same fields as DatasetDto minus `subsets`.
 */
export type GeneralDto = Omit<DatasetDto, 'subsets'>;

// ─────────────────────────────────────────────────────────────────────────────
// Root DTO
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetTomlDto {
  general?: GeneralDto;
  datasets: DatasetDto[];
}