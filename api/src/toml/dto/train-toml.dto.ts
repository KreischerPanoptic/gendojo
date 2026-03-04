/**
 * DTOs for generating train.toml consumed by --config_file.
 *
 * sd-scripts reads this file as a flat TOML dict; every key maps 1-to-1 to
 * the CLI argument of the same name (without the leading --).
 * Boolean flags (--gradient_checkpointing) become `gradient_checkpointing = true`.
 *
 * Architecture → training script mapping:
 *   sd1 / sd2  → train_network.py
 *   sdxl       → sdxl_train_network.py
 *   flux       → flux_train_network.py
 *   chroma     → flux_train_network.py  (model_type = "chroma")
 *   sd3        → sd3_train_network.py
 *   anima      → anima_train_network.py
 *   lumina     → lumina_train_network.py
 *   hunyuan    → hunyuan_image_train_network.py
 *
 * Sources: train_network.md, sdxl_train_network.md, train_network_advanced.md,
 *          flux_train_network.md, sd3_train_network.md, anima_train_network.md,
 *          lumina_train_network.md, hunyuan_image_train_network.md
 */

import type { ModelArchitecture } from '../../models/models.service';

// ─────────────────────────────────────────────────────────────────────────────
// Shared / common option types
// ─────────────────────────────────────────────────────────────────────────────

export type SaveFormat = 'safetensors' | 'ckpt' | 'pt' | 'diffusers' | 'diffusers_safetensors';
export type MixedPrecision = 'no' | 'fp16' | 'bf16';
export type SavePrecision = 'float' | 'fp16' | 'bf16';
export type LrScheduler =
  | 'constant'
  | 'cosine'
  | 'cosine_with_restarts'
  | 'polynomial'
  | 'linear'
  | 'constant_with_warmup'
  | 'inverse_sqrt'
  | 'adafactor';
export type LossType = 'l1' | 'l2' | 'huber' | 'smooth_l1';
export type HuberSchedule = 'constant' | 'exponential' | 'snr';
export type AttentionMode = 'torch' | 'xformers' | 'flash' | 'sageattn';
export type LogWith = 'tensorboard' | 'wandb' | 'all';

// ─────────────────────────────────────────────────────────────────────────────
// Base — common to ALL architectures
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseTrainDto {
  // ── Model ──────────────────────────────────────────────────────────────────
  /** Path to base model (.safetensors / .ckpt / Diffusers dir / HF model ID) */
  pretrained_model_name_or_path: string;

  // ── Dataset ────────────────────────────────────────────────────────────────
  /** Path to the dataset config TOML (--dataset_config) */
  dataset_config: string;

  // ── Output ─────────────────────────────────────────────────────────────────
  /** Output directory for LoRA files, samples, logs */
  output_dir: string;
  /** Output filename without extension */
  output_name: string;
  /** Model save format; default safetensors */
  save_model_as?: SaveFormat;
  /** Precision for saved model weights */
  save_precision?: SavePrecision;
  /** Save checkpoint every N epochs */
  save_every_n_epochs?: number;
  /** Save checkpoint every N steps */
  save_every_n_steps?: number;
  /** Keep only the last N epoch checkpoints */
  save_last_n_epochs?: number;
  /** Keep only the last N step checkpoints */
  save_last_n_steps?: number;
  /** Also save optimizer/scheduler state for resuming */
  save_state?: boolean;
  /** Save training state at end of training */
  save_state_on_train_end?: boolean;
  /** Don't write metadata into saved model */
  no_metadata?: boolean;

  // ── Network (LoRA) ──────────────────────────────────────────────────────────
  /**
   * Python module for the additional network.
   * Set automatically by TomlService based on arch if not provided.
   *   SD1/SD2/SDXL/SD3 → networks.lora
   *   FLUX/Chroma       → networks.lora_flux
   *   Anima             → networks.lora_anima
   *   Lumina            → networks.lora_lumina
   *   HunyuanImage      → networks.lora_hunyuan_image
   */
  network_module?: string;
  /** LoRA rank/dimension. Required for LoRA training. */
  network_dim: number;
  /** LoRA alpha; commonly network_dim / 2. Default 1. */
  network_alpha?: number;
  /** Dropout rate inside LoRA modules [0.0–1.0] */
  network_dropout?: number;
  /**
   * Additional network module arguments.
   * Each element is a "key=value" string, e.g. ["conv_dim=4", "conv_alpha=1"].
   * For LoRA-C3Lier (Conv2d 3x3): ["conv_dim=4", "conv_alpha=1"]
   * For LoRA+: ["loraplus_lr_ratio=16"]
   */
  network_args?: string[];
  /** Train only U-Net / DiT LoRA modules (skip text encoders) */
  network_train_unet_only?: boolean;
  /** Train only text encoder LoRA modules (skip U-Net/DiT) */
  network_train_text_encoder_only?: boolean;
  /** Load pre-trained LoRA weights to continue training */
  network_weights?: string;
  /** Automatically read dim from network_weights file */
  dim_from_weights?: boolean;
  /** Scale weight norms to prevent overfitting; 1.0 is a good starting point */
  scale_weight_norms?: number;

  // ── Learning rate ──────────────────────────────────────────────────────────
  /** Global learning rate; default for all module-specific LR options */
  learning_rate: number;
  /** Separate LR for U-Net / DiT LoRA modules */
  unet_lr?: number;
  /** Separate LR for text encoder LoRA modules (SD1/SD2/SD3, not SDXL) */
  text_encoder_lr?: number;
  /**
   * Optimizer type.
   * Common: AdamW8bit (bitsandbytes), AdamW, Adafactor, Lion, Prodigy, DAdaptation
   */
  optimizer_type: string;
  /** Additional key=value optimizer arguments */
  optimizer_args?: string[];
  /** LR scheduler */
  lr_scheduler?: LrScheduler;
  /**
   * Warmup steps.
   * Fractional value < 1 is interpreted as fraction of total steps.
   */
  lr_warmup_steps?: number;
  /** Number of cosine restart cycles (cosine_with_restarts) */
  lr_scheduler_num_cycles?: number;
  /** Polynomial decay power (polynomial scheduler) */
  lr_scheduler_power?: number;
  /** Steps over which LR decays */
  lr_decay_steps?: number;
  /** Timescale for inverse_sqrt scheduler */
  lr_scheduler_timescale?: number;
  /** Minimum LR ratio for schedulers that support it */
  lr_scheduler_min_lr_ratio?: number;

  // ── Training loop ──────────────────────────────────────────────────────────
  /** Total training steps (overridden by max_train_epochs if both set) */
  max_train_steps?: number;
  /** Total training epochs (takes precedence over max_train_steps) */
  max_train_epochs?: number;
  /** Starting epoch number (for display / LR scheduler) */
  initial_epoch?: number;
  /** Starting global step; overwrites initial_epoch */
  initial_step?: number;
  /** Skip batches until initial_step is reached */
  skip_until_initial_step?: boolean;
  /** Gradient accumulation steps; effective batch = train_batch_size × N */
  gradient_accumulation_steps?: number;
  /** Gradient clipping max norm; 0 = disabled */
  max_grad_norm?: number;
  /** Resume training from a saved state directory */
  resume?: string;

  // ── Precision / memory ─────────────────────────────────────────────────────
  /** Mixed precision for training */
  mixed_precision?: MixedPrecision;
  /** Full fp16 training including gradients (reduces VRAM, may be unstable) */
  full_fp16?: boolean;
  /** Full bf16 training including gradients */
  full_bf16?: boolean;
  /** Load base model in FP8 to reduce VRAM (experimental, PyTorch 2.1+) */
  fp8_base?: boolean;
  /** Gradient checkpointing (reduces VRAM at cost of speed) */
  gradient_checkpointing?: boolean;
  /** Cache VAE latents to memory */
  cache_latents?: boolean;
  /** Cache VAE latents to disk */
  cache_latents_to_disk?: boolean;
  /** Optimise for low CPU RAM environment (e.g. Colab) */
  lowram?: boolean;
  /** Allow more aggressive VRAM use when GPU has ample VRAM */
  highvram?: boolean;
  /** Disable mmap loading for .safetensors (faster in WSL) */
  disable_mmap_load_safetensors?: boolean;

  // ── Attention ──────────────────────────────────────────────────────────────
  /** Use PyTorch scaled dot-product attention (recommended) */
  sdpa?: boolean;
  /** Use xformers memory-efficient attention */
  xformers?: boolean;
  /** Use older memory-efficient attention (slower than sdpa/xformers) */
  mem_eff_attn?: boolean;

  // ── Loss / regularisation ──────────────────────────────────────────────────
  /** Loss function */
  loss_type?: LossType;
  /** Huber loss scheduling when loss_type = huber | smooth_l1 */
  huber_schedule?: HuberSchedule;
  /** Huber c parameter */
  huber_c?: number;
  /** Huber scale parameter */
  huber_scale?: number;
  /** Noise offset value (improves contrast range learning; ~0.0357 for SDXL) */
  noise_offset?: number;
  /** Randomise noise offset strength between 0 and noise_offset */
  noise_offset_random_strength?: boolean;
  /** Adaptive noise scale based on latent statistics (use with noise_offset) */
  adaptive_noise_scale?: number;
  /** Multi-resolution noise iterations (~6–10) */
  multires_noise_iterations?: number;
  /** Multi-resolution noise discount (~0.3) */
  multires_noise_discount?: number;
  /** Input Perturbation Noise gamma (~0.1) */
  ip_noise_gamma?: number;
  /** Randomise ip_noise_gamma strength */
  ip_noise_gamma_random_strength?: boolean;
  /** Min-SNR weighting gamma (recommended ~5) */
  min_snr_gamma?: number;
  /** Debiased estimation loss */
  debiased_estimation_loss?: boolean;
  /** Masked loss (requires conditioning_data_dir or alpha_mask in dataset) */
  masked_loss?: boolean;

  // ── Logging / sample generation ────────────────────────────────────────────
  /** TensorBoard / wandb log directory */
  logging_dir?: string;
  /** Logging backend */
  log_with?: LogWith;
  /** Prefix for log subdirectory name */
  log_prefix?: string;
  /** wandb API key */
  wandb_api_key?: string;
  /** wandb run name */
  wandb_run_name?: string;
  /** Log training configuration to tracker at start */
  log_config?: boolean;
  /** File containing prompts for sample generation */
  sample_prompts?: string;
  /** Generate samples every N epochs */
  sample_every_n_epochs?: number;
  /** Generate samples every N steps */
  sample_every_n_steps?: number;
  /** Generate one sample before training starts */
  sample_at_first?: boolean;
  /** Sampler used for sample generation */
  sample_sampler?: string;

  // ── Misc ───────────────────────────────────────────────────────────────────
  /** Random seed for reproducibility */
  seed?: number;
  /** DataLoader worker process count */
  max_data_loader_n_workers?: number;
  /** Keep DataLoader workers alive between epochs */
  persistent_data_loader_workers?: boolean;
  /** Tokenizer cache directory for offline training */
  tokenizer_cache_dir?: string;
  /** Merge LoRA weights into base model before training starts */
  base_weights?: string[];
  /** Multipliers for base_weights */
  base_weights_multiplier?: number[];

  // ── Validation loss (PR #1903) ─────────────────────────────────────────────
  /** Global validation split when not set in dataset config [0.0–1.0] */
  validation_split?: number;
  /** Run validation every N steps */
  validate_every_n_steps?: number;
  /** Run validation every N epochs (default: once per epoch) */
  validate_every_n_epochs?: number;
  /** Max batches per validation run */
  max_validation_steps?: number;
  /** Seed for validation data shuffling */
  validation_seed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SD1 / SD2 — train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export interface Sd1TrainDto extends BaseTrainDto {
  arch: 'sd1';
  /** Must NOT be specified for SD1 */
  v2?: never;
  v_parameterization?: never;
  /** Optional clip skip [2 = clip skip 2] */
  clip_skip?: number;
  /** Max token length; 75 (default), 150, or 225 */
  max_token_length?: 75 | 150 | 225;
}

export interface Sd2TrainDto extends BaseTrainDto {
  arch: 'sd2';
  /** Must be true for SD2 models */
  v2: true;
  /** True for SD2 768px v-prediction models */
  v_parameterization?: boolean;
  /** Clip skip; usually not needed for SD2 */
  clip_skip?: number;
  /** Max token length; 75 (default), 150, or 225 */
  max_token_length?: 75 | 150 | 225;
}

// ─────────────────────────────────────────────────────────────────────────────
// SDXL — sdxl_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export interface SdxlTrainDto extends BaseTrainDto {
  arch: 'sdxl';
  /**
   * External VAE path (optional — SDXL checkpoint already contains a VAE).
   * Specify when using a different VAE.
   */
  vae?: string;
  /**
   * Keep VAE in float32 even with fp16 training.
   * Recommended when mixed_precision = "fp16" as SDXL VAE can produce NaNs.
   */
  no_half_vae?: boolean;
  /**
   * LR for Text Encoder 1 (OpenCLIP ViT-G/14).
   * Overrides text_encoder_lr for TE1 specifically.
   * Recommended to be smaller than unet_lr (e.g. 1e-5).
   */
  text_encoder_lr1?: number;
  /**
   * LR for Text Encoder 2 (CLIP ViT-L/14).
   * Overrides text_encoder_lr for TE2 specifically.
   */
  text_encoder_lr2?: number;
  /**
   * Cache text encoder outputs to memory.
   * Requires network_train_unet_only = true.
   * Disables shuffle_caption and other caption augmentations.
   */
  cache_text_encoder_outputs?: boolean;
  /** Cache text encoder outputs to disk */
  cache_text_encoder_outputs_to_disk?: boolean;
  /**
   * Fuse backward pass and optimizer step to reduce VRAM.
   * Experimental; currently only supports Adafactor.
   * Cannot be used with gradient_accumulation_steps > 1.
   */
  fused_backward_pass?: boolean;
  /** Load only U-Net in FP8 (alternative to fp8_base for SDXL) */
  fp8_base_unet?: boolean;
  /**
   * Per-block swap of Transformer blocks between CPU and GPU.
   * Reduces VRAM at cost of speed.
   */
  blocks_to_swap?: number;
  /**
   * Max token length: 75 / 150 / 225.
   * Longer = more complex prompts, more VRAM.
   * Default 75.
   */
  max_token_length?: 75 | 150 | 225;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUX.1 — flux_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export type FluxTimestepSampling =
  | 'sigma'
  | 'uniform'
  | 'sigmoid'
  | 'shift'
  | 'flux_shift';

export type FluxModelPredictionType = 'raw' | 'additive' | 'sigma_scaled';

export interface FluxTrainDto extends BaseTrainDto {
  arch: 'flux';
  /** Path to CLIP-L text encoder .safetensors */
  clip_l: string;
  /** Path to T5-XXL text encoder .safetensors */
  t5xxl: string;
  /** Path to FLUX AutoEncoder .safetensors */
  ae: string;
  /**
   * Guidance scale embedded in FLUX.1 dev.
   * Use 1.0 for training (disables embedded guidance).
   * Default 3.5 — must be explicitly set.
   */
  guidance_scale?: number;
  /**
   * Timestep sampling method.
   * Recommended: flux_shift.
   * Default: sigma.
   */
  timestep_sampling?: FluxTimestepSampling;
  /**
   * Sigmoid scale for sigmoid/shift/flux_shift sampling.
   * Default 1.0.
   */
  sigmoid_scale?: number;
  /**
   * What the model predicts.
   * Recommended: raw.
   * Default: sigma_scaled.
   */
  model_prediction_type?: FluxModelPredictionType;
  /**
   * Flow matching scheduler shift for --timestep_sampling shift.
   * Default 3.0.
   */
  discrete_flow_shift?: number;
  /**
   * Cache CLIP-L + T5-XXL outputs (recommended).
   * Requires network_train_unet_only = true.
   */
  cache_text_encoder_outputs?: boolean;
  cache_text_encoder_outputs_to_disk?: boolean;
  /**
   * Number of Transformer blocks to swap CPU ↔ GPU.
   * Larger = less VRAM, slower training.
   */
  blocks_to_swap?: number;
  /**
   * Apply T5-XXL attention mask.
   * Not recommended for FLUX (limited inference support).
   */
  apply_t5_attn_mask?: boolean;
  /** Max token length for T5-XXL; default 512 for FLUX */
  t5xxl_max_token_length?: number;
  /**
   * LoRA-GGPO: ["ggpo_sigma=0.03", "ggpo_beta=0.01"]
   * Or Q/K/V split: ["split_qkv=True"]
   * These go into network_args
   */
}

// ─────────────────────────────────────────────────────────────────────────────
// Chroma — flux_train_network.py  +  model_type = "chroma"
// ─────────────────────────────────────────────────────────────────────────────

export interface ChromaTrainDto extends BaseTrainDto {
  arch: 'chroma';
  /** Must be "chroma" — identifies the model variant to flux_train_network.py */
  model_type: 'chroma';
  /** Chroma does NOT use CLIP-L — do not provide */
  clip_l?: never;
  /** T5-XXL text encoder (shared with FLUX) */
  t5xxl: string;
  /** AutoEncoder (shared with FLUX) */
  ae: string;
  /**
   * Must be 0.0 for Chroma (disables embedded guidance scale entirely).
   */
  guidance_scale: 0.0;
  /**
   * Recommended: sigmoid for Chroma.
   */
  timestep_sampling?: FluxTimestepSampling;
  sigmoid_scale?: number;
  model_prediction_type?: FluxModelPredictionType;
  discrete_flow_shift?: number;
  /**
   * Required for Chroma — applies attention masks for T5XXL.
   */
  apply_t5_attn_mask: true;
  cache_text_encoder_outputs?: boolean;
  cache_text_encoder_outputs_to_disk?: boolean;
  blocks_to_swap?: number;
  t5xxl_max_token_length?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SD3 / SD3.5 — sd3_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export type Sd3WeightingScheme =
  | 'sigma_sqrt'
  | 'logit_normal'
  | 'mode'
  | 'cosmap'
  | 'uniform'
  | 'none';

export interface Sd3TrainDto extends BaseTrainDto {
  arch: 'sd3';
  /**
   * CLIP-L path. Optional when using a single all-in-one .safetensors.
   * The components are detected automatically from a single file.
   */
  clip_l?: string;
  /** CLIP-G path (optional for single-file format) */
  clip_g?: string;
  /** T5-XXL path (optional for single-file format) */
  t5xxl?: string;
  /** VAE path (optional — usually embedded in single-file format) */
  vae?: string;
  /**
   * Max token length for T5-XXL. Default 256.
   * SD3 uses 256 by default (shorter than FLUX's 512).
   */
  t5xxl_max_token_length?: number;
  /** Apply padding mask to CLIP-L/CLIP-G outputs */
  apply_lg_attn_mask?: boolean;
  /** Apply padding mask to T5-XXL outputs */
  apply_t5_attn_mask?: boolean;
  /** Dropout rate for CLIP-L during training [0.0–1.0] */
  clip_l_dropout_rate?: number;
  /** Dropout rate for CLIP-G during training [0.0–1.0] */
  clip_g_dropout_rate?: number;
  /** Dropout rate for T5-XXL during training [0.0–1.0] */
  t5_dropout_rate?: number;
  /** SD3.5: Random crop probability for positional embedding */
  pos_emb_random_crop_rate?: number;
  /** SD3.5 experimental: Scale positional embedding with resolution */
  enable_scaled_pos_embed?: boolean;
  /** Timestep distribution shift. Default 1.0 */
  training_shift?: number;
  /**
   * Loss weighting scheme by timestep.
   * Default: uniform.
   */
  weighting_scheme?: Sd3WeightingScheme;
  /** Mean for logit_normal weighting. Default 0.0. */
  logit_mean?: number;
  /** Std for logit_normal weighting. Default 1.0. */
  logit_std?: number;
  /** Scale for mode weighting. Default 1.29. */
  mode_scale?: number;
  /** Cache text encoder outputs (highly recommended for SD3's 3 encoders) */
  cache_text_encoder_outputs?: boolean;
  cache_text_encoder_outputs_to_disk?: boolean;
  /** CPU ↔ GPU block swapping */
  blocks_to_swap?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anima — anima_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export interface AnimaTrainDto extends BaseTrainDto {
  arch: 'anima';
  /** Path to Qwen3-0.6B text encoder (directory or .safetensors) */
  qwen3: string;
  /** Path to Qwen-Image VAE .safetensors or .pth */
  vae: string;
  /**
   * Optional: separate LLM Adapter weights.
   * If omitted and the DiT contains llm_adapter.out_proj.weight, it is
   * loaded automatically from there.
   */
  llm_adapter_path?: string;
  /**
   * Optional: T5 tokenizer directory.
   * If omitted, uses bundled configs/t5_old/.
   */
  t5_tokenizer_path?: string;
  /** Timestep sampling method. Default sigmoid. */
  timestep_sampling?: FluxTimestepSampling;
  /** Flow shift for shift sampling. Default 1.0. */
  discrete_flow_shift?: number;
  /** Scale for sigmoid/shift/flux_shift sampling. Default 1.0. */
  sigmoid_scale?: number;
  /** Max token length for Qwen3. Default 512. */
  qwen3_max_token_length?: number;
  /** Max token length for T5 tokenizer. Default 512. */
  t5_max_token_length?: number;
  /**
   * Attention implementation.
   * xformers requires split_attn = true.
   * sageattn is inference-only (do not use for training).
   * Overrides --xformers.
   */
  attn_mode?: AttentionMode;
  /** Split batch during attention to reduce VRAM. Required for xformers. */
  split_attn?: boolean;
  /** Chunk size for Qwen-Image VAE processing. Reduces VRAM. */
  vae_chunk_size?: number;
  /** Disable internal VAE cache to reduce VRAM. */
  vae_disable_cache?: boolean;
  /** Cache text encoder outputs */
  cache_text_encoder_outputs?: boolean;
  cache_text_encoder_outputs_to_disk?: boolean;
  /** CPU ↔ GPU block swapping. Max 26 for Anima-Preview (28-block model). */
  blocks_to_swap?: number;
  /**
   * Async CPU offload of activations (alternative to blocks_to_swap).
   * Cannot combine with blocks_to_swap or cpu_offload_checkpointing.
   */
  unsloth_offload_checkpointing?: boolean;
  // Component-wise LRs — mainly for full fine-tune; for LoRA use network_reg_lrs in network_args
  self_attn_lr?: number;
  cross_attn_lr?: number;
  mlp_lr?: number;
  mod_lr?: number;
  llm_adapter_lr?: number;
  // fp8_base is NOT supported for Anima
  fp8_base?: never;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lumina Image 2.0 — lumina_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export type LuminaTimestepSampling =
  | 'sigma'
  | 'uniform'
  | 'sigmoid'
  | 'shift'
  | 'nextdit_shift';

export interface LuminaTrainDto extends BaseTrainDto {
  arch: 'lumina';
  /** Path to Gemma2 text encoder .safetensors */
  gemma2: string;
  /** Path to AutoEncoder .safetensors (same ae.safetensors as FLUX) */
  ae: string;
  /** Max token length for Gemma2. Default 256. */
  gemma2_max_token_length?: number;
  /**
   * Timestep sampling. Recommended: nextdit_shift.
   * Default: shift.
   */
  timestep_sampling?: LuminaTimestepSampling;
  /** Euler Discrete Scheduler discrete flow shift. Default 6.0. */
  discrete_flow_shift?: number;
  /** Model prediction type. Default and recommended: raw. */
  model_prediction_type?: FluxModelPredictionType;
  /**
   * System prompt prepended to all captions.
   * Recommended: "You are an assistant designed to generate high-quality images based on user prompts."
   */
  system_prompt?: string;
  /** Use Flash Attention (requires flash-attn package) */
  use_flash_attn?: boolean;
  /** Use Sage Attention */
  use_sage_attn?: boolean;
  /** Sigmoid scale for applicable samplers. Default 1.0. */
  sigmoid_scale?: number;
  /** Sampling batch size (defaults to training batch size) */
  sample_batch_size?: number;
  cache_text_encoder_outputs?: boolean;
  cache_text_encoder_outputs_to_disk?: boolean;
  blocks_to_swap?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HunyuanImage 2.1 — hunyuan_image_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export interface HunyuanTrainDto extends BaseTrainDto {
  arch: 'hunyuan';
  /** Path to Qwen2.5-VL text encoder (bfloat16) */
  text_encoder: string;
  /** Path to byT5 text encoder (float16) */
  byt5: string;
  /** Path to HunyuanImage-compatible VAE .safetensors */
  vae: string;
  /**
   * Required — LoRA for text encoders is not supported in HunyuanImage.
   * Must always be true.
   */
  network_train_unet_only: true;
  /** Flow matching discrete shift. Default 5.0. */
  discrete_flow_shift?: number;
  /** Model prediction type. Default and recommended: raw. */
  model_prediction_type?: FluxModelPredictionType;
  /**
   * Timestep sampling method.
   * Default: sigma.
   */
  timestep_sampling?: FluxTimestepSampling;
  /** Sigmoid scale. Default 1.0. */
  sigmoid_scale?: number;
  /**
   * Attention implementation.
   * When using xformers with batch size > 1, also set split_attn = true.
   */
  attn_mode?: AttentionMode;
  /** Split batch during attention (required for xformers with batch_size > 1) */
  split_attn?: boolean;
  /**
   * Scaled FP8 for DiT training (replaces unsupported fp8_base for HunyuanImage).
   * Recommended for <40GB VRAM.
   */
  fp8_scaled?: boolean;
  /** FP8 for Qwen2.5-VL VLM text encoder */
  fp8_vl?: boolean;
  /** Run text encoders on CPU (useful for VRAM < 12GB) */
  text_encoder_cpu?: boolean;
  /** CPU ↔ GPU block swapping. Up to 37 blocks. */
  blocks_to_swap?: number;
  /** CPU offload checkpointing (cannot combine with blocks_to_swap) */
  cpu_offload_checkpointing?: boolean;
  cache_text_encoder_outputs?: boolean;
  cache_text_encoder_outputs_to_disk?: boolean;
  /** VAE chunked processing chunk size (e.g. 16) */
  vae_chunk_size?: number;
  // fp8_base is not supported for HunyuanImage
  fp8_base?: never;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root union type
// ─────────────────────────────────────────────────────────────────────────────

export type TrainTomlDto =
  | Sd1TrainDto
  | Sd2TrainDto
  | SdxlTrainDto
  | FluxTrainDto
  | ChromaTrainDto
  | Sd3TrainDto
  | AnimaTrainDto
  | LuminaTrainDto
  | HunyuanTrainDto;

// ─────────────────────────────────────────────────────────────────────────────
// Metadata derived from arch — consumed by TomlService and JobsService
// ─────────────────────────────────────────────────────────────────────────────

export interface ArchMeta {
  /** Python script to launch with accelerate */
  script: string;
  /** Default network module for this architecture */
  defaultNetworkModule: string;
}

export const ARCH_META: Readonly<Record<ModelArchitecture, ArchMeta | null>> = {
  sd1:     { script: 'train_network.py',                  defaultNetworkModule: 'networks.lora' },
  sd2:     { script: 'train_network.py',                  defaultNetworkModule: 'networks.lora' },
  sdxl:    { script: 'sdxl_train_network.py',             defaultNetworkModule: 'networks.lora' },
  flux:    { script: 'flux_train_network.py',             defaultNetworkModule: 'networks.lora_flux' },
  chroma:  { script: 'flux_train_network.py',             defaultNetworkModule: 'networks.lora_flux' },
  sd3:     { script: 'sd3_train_network.py',              defaultNetworkModule: 'networks.lora' },
  anima:   { script: 'anima_train_network.py',            defaultNetworkModule: 'networks.lora_anima' },
  lumina:  { script: 'lumina_train_network.py',           defaultNetworkModule: 'networks.lora_lumina' },
  hunyuan: { script: 'hunyuan_image_train_network.py',    defaultNetworkModule: 'networks.lora_hunyuan_image' },
  unknown: null,
};