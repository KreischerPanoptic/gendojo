// ─────────────────────────────────────────────────────────────────────────────
// Shared option types (used verbatim in TOML output)
// ─────────────────────────────────────────────────────────────────────────────

/** --resize_interpolation / resize_interpolation */
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
 * All fields are optional — only present fields are written to TOML.
 */
export interface SubsetLevelOptions {
  // ── Caption / augmentation ─────────────────────────────────────────────────
  /** Randomly shuffle caption tags during training */
  shuffle_caption?: boolean;
  /** Number of tokens to keep fixed at the front when shuffle_caption is true */
  keep_tokens?: number;
  /** Separator that marks the always-kept section; e.g. "|||" */
  keep_tokens_separator?: string;
  /**
   * String that groups several tags into one shuffle/drop unit.
   * The group is then replaced by caption_separator in the actual caption.
   * e.g. secondary_separator = ";;;"
   */
  secondary_separator?: string;
  /** Enable wildcard {opt1|opt2} syntax in captions */
  enable_wildcard?: boolean;
  /** Horizontal flip augmentation (disabled when cache_latents is set) */
  flip_aug?: boolean;
  /** Color/hue jitter augmentation (disabled when cache_latents is set) */
  color_aug?: boolean;
  /** Random crop instead of centre crop (disabled when cache_latents is set) */
  random_crop?: boolean;
  /** Range for face-crop augmentation [min_scale, max_scale] */
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
   */
  resize_interpolation?: ResizeInterpolation;
  /** How many repeats of this subset per epoch (≡ --dataset_repeats) */
  num_repeats?: number;

  // ── Caption dropout (requires the script to support it) ───────────────────
  /** Drop the entire caption every N epochs */
  caption_dropout_every_n_epochs?: number;
  /** Per-image probability of dropping the entire caption [0.0–1.0] */
  caption_dropout_rate?: number;
  /** Per-tag probability of dropping individual tags [0.0–1.0] */
  caption_tag_dropout_rate?: number;

  // ── Validation split (train_network.py PR #1903) ──────────────────────────
  /**
   * Fraction of this subset used for validation [0.0–1.0].
   * 1.0 = entire subset is used only for validation.
   * Takes precedence over the global --validation_split CLI flag.
   */
  validation_split?: number;
}