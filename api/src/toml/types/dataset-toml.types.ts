// ─────────────────────────────────────────────────────────────────────────────
// Shared option types (used verbatim in TOML output)
// ─────────────────────────────────────────────────────────────────────────────

/** resize_interpolation accepted values */
export type ResizeInterpolation =
  | 'lanczos'
  | 'nearest'
  | 'bilinear'
  | 'linear'
  | 'bicubic'
  | 'cubic'
  | 'area'
  | 'box';

/**
 * Options that can appear at [general], [[datasets]], or [[datasets.subsets]].
 *
 * Sources: config_README-en.md tables "Common options" and "DreamBooth-specific"
 * All fields are optional — only present fields are written to TOML.
 *
 * Precedence (sd-scripts): subset > dataset > general.
 */
export interface SubsetLevelOptions {
  // ── Caption / augmentation ──────────────────────────────────────────────────

  /** Randomly shuffle caption tags during training */
  shuffle_caption?: boolean;

  /** Number of tokens to keep fixed at the front when shuffle_caption is true */
  keep_tokens?: number;

  /** Separator that marks the always-kept section; e.g. "|||" */
  keep_tokens_separator?: string;

  /**
   * String that groups several tags into one shuffle/drop unit.
   * Replaced by caption_separator in the final caption.
   * e.g. secondary_separator = ";;;"
   */
  secondary_separator?: string;

  /** Enable wildcard {opt1|opt2} syntax in captions */
  enable_wildcard?: boolean;

  /** Horizontal flip augmentation.
   * Disabled silently by sd-scripts when cache_latents is set. */
  flip_aug?: boolean;

  /** Color/hue jitter augmentation.
   * Disabled silently by sd-scripts when cache_latents is set. */
  color_aug?: boolean;

  /** Random crop instead of centre crop.
   * Disabled silently by sd-scripts when cache_latents is set. */
  random_crop?: boolean;

  /**
   * Range [min_scale, max_scale] for face-crop augmentation.
   * e.g. [1.0, 3.0]
   */
  face_crop_aug_range?: [number, number];

  /** String prepended to every caption (included when shuffling) */
  caption_prefix?: string;

  /** String appended to every caption (included when shuffling) */
  caption_suffix?: string;

  /** Tag separator used in caption output; default "," */
  caption_separator?: string;

  /**
   * Interpolation method when resizing images to training resolution.
   * Default: area for down-scaling, lanczos for up-scaling.
   * When specified, the same method is used for both.
   * lanczos/box → PIL; others → OpenCV.
   */
  resize_interpolation?: ResizeInterpolation;

  /** How many repeats of this subset per epoch (≡ --dataset_repeats) */
  num_repeats?: number;

  // ── DreamBooth options — valid at [general] + [[datasets]] + [[datasets.subsets]] ──
  //
  // Per config_README-en.md, these are DreamBooth-specific but can be
  // specified at the general and dataset levels (they are ignored by
  // fine-tuning subsets at runtime).

  /**
   * File extension for caption files; e.g. ".txt".
   * Valid at [general], [[datasets]], [[datasets.subsets]].
   */
  caption_extension?: string;

  /**
   * Cache image size and caption in metadata_cache.json inside image_dir.
   * Speeds up repeated dataset loading for large datasets.
   * Valid at [general], [[datasets]], [[datasets.subsets]].
   */
  cache_info?: boolean;

  /**
   * Directory containing mask images (same basename as training images).
   * White = train, black = ignore. Also used by ControlNet-LLLite.
   * Valid at [general], [[datasets]], [[datasets.subsets]].
   */
  conditioning_data_dir?: string;

  /**
   * Use the image's alpha channel as a loss mask instead of conditioning_data_dir.
   * Valid at [general], [[datasets]], [[datasets.subsets]].
   */
  alpha_mask?: boolean;

  // ── Caption dropout ─────────────────────────────────────────────────────────

  /** Drop the entire caption every N epochs */
  caption_dropout_every_n_epochs?: number;

  /** Per-image probability of dropping the entire caption [0.0–1.0] */
  caption_dropout_rate?: number;

  /** Per-tag probability of dropping individual tags [0.0–1.0] */
  caption_tag_dropout_rate?: number;

  // ── Validation split (PR #1903) ────────────────────────────────────────────

  /**
   * Fraction of this subset used for validation [0.0–1.0].
   * Takes precedence over the global --validation_split CLI flag.
   */
  validation_split?: number;
}