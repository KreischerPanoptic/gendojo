/**
 * Training presets for all supported architectures.
 *
 * Each architecture has three tiers:
 *   fast     — fewer epochs, higher LR, lower rank. Quick iteration / testing.
 *   balanced — recommended starting point for most use-cases.
 *   quality  — more epochs, lower LR, higher rank. Best final result.
 *
 * Sources:
 *   flux_train_network.md, sdxl_train_network.md, train_network.md,
 *   sd3_train_network.md, anima_train_network.md, lumina_train_network.md,
 *   hunyuan_image_train_network.md
 */

import type { TrainingPreset } from '../entities/presets.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fluxBase = {
  optimizer_type: 'AdamW8bit',
  lr_scheduler: 'cosine_with_restarts' as const,
  lr_scheduler_num_cycles: 1,
  mixed_precision: 'bf16' as const,
  save_precision: 'bf16' as const,
  gradient_checkpointing: true,
  cache_latents: true,
  // FLUX: TE outputs must be cached; requires unet_only = true
  network_train_unet_only: true,
  cache_text_encoder_outputs: true,
  // FLUX.1 training guidance (1.0 = disable embedded guidance during training)
  guidance_scale: 1.0,
  timestep_sampling: 'sigmoid',
  model_prediction_type: 'raw',
  save_every_n_epochs: 2,
  max_data_loader_n_workers: 2,
  persistent_data_loader_workers: true,
};

const sdBase = {
  optimizer_type: 'AdamW8bit',
  lr_scheduler: 'cosine_with_restarts' as const,
  lr_scheduler_num_cycles: 1,
  mixed_precision: 'fp16' as const,      // SD1/2 prefer fp16; BF16 may cause issues
  save_precision: 'fp16' as const,
  gradient_checkpointing: true,
  cache_latents: true,
  save_every_n_epochs: 2,
  max_data_loader_n_workers: 2,
  persistent_data_loader_workers: true,
};

const modernBase = {
  optimizer_type: 'AdamW8bit',
  lr_scheduler: 'cosine_with_restarts' as const,
  lr_scheduler_num_cycles: 1,
  mixed_precision: 'bf16' as const,
  save_precision: 'bf16' as const,
  gradient_checkpointing: true,
  cache_latents: true,
  save_every_n_epochs: 2,
  max_data_loader_n_workers: 2,
  persistent_data_loader_workers: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// FLUX.1
// ─────────────────────────────────────────────────────────────────────────────

const FLUX_FAST: TrainingPreset = {
  id: 'flux-fast',
  arch: 'flux',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick test run — low rank, 5 epochs. Good for verifying dataset and captions.',
  config: {
    ...fluxBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 3e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const FLUX_BALANCED: TrainingPreset = {
  id: 'flux-balanced',
  arch: 'flux',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for FLUX.1 LoRA on 24 GB VRAM. Good quality without excessive training time.',
  config: {
    ...fluxBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 1e-4,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
  },
  source: 'system'
};

const FLUX_QUALITY: TrainingPreset = {
  id: 'flux-quality',
  arch: 'flux',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank and more epochs for best final result. Requires ~24 GB VRAM.',
  config: {
    ...fluxBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 5e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// Chroma (FLUX variant — guidance=0, apply_t5_attn_mask required)
// ─────────────────────────────────────────────────────────────────────────────

const chromaBase = {
  ...fluxBase,
  // Chroma-specific overrides
  guidance_scale: 0.0,           // Must be 0.0 for Chroma
  apply_t5_attn_mask: true,      // Required for Chroma
  model_type: 'chroma',          // Identifies variant to flux_train_network.py
  timestep_sampling: 'sigmoid',
};

const CHROMA_FAST: TrainingPreset = {
  id: 'chroma-fast',
  arch: 'chroma',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick Chroma LoRA test. Note: guidance_scale=0 and apply_t5_attn_mask=true are required.',
  config: {
    ...chromaBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 3e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const CHROMA_BALANCED: TrainingPreset = {
  id: 'chroma-balanced',
  arch: 'chroma',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for Chroma LoRA. guidance_scale=0 and apply_t5_attn_mask=true are locked.',
  config: {
    ...chromaBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 1e-4,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
  },
  source: 'system'
};

const CHROMA_QUALITY: TrainingPreset = {
  id: 'chroma-quality',
  arch: 'chroma',
  tier: 'quality',
  label: 'Quality',
  description: 'High-quality Chroma LoRA with higher rank and longer training.',
  config: {
    ...chromaBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 5e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// SDXL
// ─────────────────────────────────────────────────────────────────────────────

const sdxlBase = {
  ...modernBase,
  // noise_offset improves contrast/brightness range learning — standard SDXL rec
  noise_offset: 0.0357,
};

const SDXL_FAST: TrainingPreset = {
  id: 'sdxl-fast',
  arch: 'sdxl',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SDXL LoRA test. Low rank, 5 epochs.',
  config: {
    ...sdxlBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const SDXL_BALANCED: TrainingPreset = {
  id: 'sdxl-balanced',
  arch: 'sdxl',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for SDXL LoRA. Includes noise_offset=0.0357 for better tonal range.',
  config: {
    ...sdxlBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
  },
  source: 'system'
};

const SDXL_QUALITY: TrainingPreset = {
  id: 'sdxl-quality',
  arch: 'sdxl',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank SDXL LoRA for best results. Longer training time.',
  config: {
    ...sdxlBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// SD 1.x
// ─────────────────────────────────────────────────────────────────────────────

const SD1_FAST: TrainingPreset = {
  id: 'sd1-fast',
  arch: 'sd1',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SD1.x LoRA test. Low rank, 5 epochs.',
  config: {
    ...sdBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const SD1_BALANCED: TrainingPreset = {
  id: 'sd1-balanced',
  arch: 'sd1',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for SD 1.x LoRA training.',
  config: {
    ...sdBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
    clip_skip: 2,
  },
  source: 'system'
};

const SD1_QUALITY: TrainingPreset = {
  id: 'sd1-quality',
  arch: 'sd1',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank SD1.x LoRA for best results.',
  config: {
    ...sdBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
    clip_skip: 2,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// SD 2.x
// ─────────────────────────────────────────────────────────────────────────────

const SD2_FAST: TrainingPreset = {
  id: 'sd2-fast',
  arch: 'sd2',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SD2.x LoRA test. Low rank, 5 epochs.',
  config: {
    ...sdBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
    v2: true,
  },
  source: 'system'
};

const SD2_BALANCED: TrainingPreset = {
  id: 'sd2-balanced',
  arch: 'sd2',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for SD 2.x LoRA. v2=true is set automatically.',
  config: {
    ...sdBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
    v2: true,
  },
  source: 'system'
};

const SD2_QUALITY: TrainingPreset = {
  id: 'sd2-quality',
  arch: 'sd2',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank SD2.x LoRA. v2=true is set automatically.',
  config: {
    ...sdBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
    v2: true,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// SD3 / SD3.5
// ─────────────────────────────────────────────────────────────────────────────

const SD3_FAST: TrainingPreset = {
  id: 'sd3-fast',
  arch: 'sd3',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SD3 LoRA test. TE output caching enabled by default.',
  config: {
    ...modernBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
    cache_text_encoder_outputs: true,
    weighting_scheme: 'logit_normal',
  },
  source: 'system'
};

const SD3_BALANCED: TrainingPreset = {
  id: 'sd3-balanced',
  arch: 'sd3',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for SD3/SD3.5 LoRA. Caches all three text encoder outputs.',
  config: {
    ...modernBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
    cache_text_encoder_outputs: true,
    weighting_scheme: 'logit_normal',
  },
  source: 'system'
};

const SD3_QUALITY: TrainingPreset = {
  id: 'sd3-quality',
  arch: 'sd3',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank SD3/SD3.5 LoRA for best quality.',
  config: {
    ...modernBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
    cache_text_encoder_outputs: true,
    weighting_scheme: 'logit_normal',
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// Anima
// ─────────────────────────────────────────────────────────────────────────────

const animaBase = {
  ...modernBase,
  timestep_sampling: 'sigmoid',
  cache_text_encoder_outputs: true,
};

const ANIMA_FAST: TrainingPreset = {
  id: 'anima-fast',
  arch: 'anima',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick Anima LoRA test run.',
  config: {
    ...animaBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const ANIMA_BALANCED: TrainingPreset = {
  id: 'anima-balanced',
  arch: 'anima',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for Anima LoRA. Text encoder outputs cached to reduce VRAM.',
  config: {
    ...animaBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
  },
  source: 'system'
};

const ANIMA_QUALITY: TrainingPreset = {
  id: 'anima-quality',
  arch: 'anima',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank Anima LoRA for best results.',
  config: {
    ...animaBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// Lumina Image 2.0
// ─────────────────────────────────────────────────────────────────────────────

const luminaBase = {
  ...modernBase,
  // nextdit_shift is the Lumina-recommended sampler; shift is the default
  timestep_sampling: 'nextdit_shift',
  discrete_flow_shift: 6.0,
  model_prediction_type: 'raw',
};

const LUMINA_FAST: TrainingPreset = {
  id: 'lumina-fast',
  arch: 'lumina',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick Lumina LoRA test run.',
  config: {
    ...luminaBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const LUMINA_BALANCED: TrainingPreset = {
  id: 'lumina-balanced',
  arch: 'lumina',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for Lumina Image 2.0 LoRA. Uses nextdit_shift sampling.',
  config: {
    ...luminaBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
  },
  source: 'system'
};

const LUMINA_QUALITY: TrainingPreset = {
  id: 'lumina-quality',
  arch: 'lumina',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank Lumina LoRA for best results.',
  config: {
    ...luminaBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// HunyuanImage 2.1
// ─────────────────────────────────────────────────────────────────────────────

const hunyuanBase = {
  ...modernBase,
  // HunyuanImage requires unet_only — TE LoRA is not supported
  network_train_unet_only: true,
  timestep_sampling: 'sigma',
  discrete_flow_shift: 5.0,
  model_prediction_type: 'raw',
};

const HUNYUAN_FAST: TrainingPreset = {
  id: 'hunyuan-fast',
  arch: 'hunyuan',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick HunyuanImage LoRA test. network_train_unet_only is always required.',
  config: {
    ...hunyuanBase,
    network_dim: 8,
    network_alpha: 4,
    learning_rate: 1e-4,
    max_train_epochs: 5,
    save_every_n_epochs: 1,
  },
  source: 'system'
};

const HUNYUAN_BALANCED: TrainingPreset = {
  id: 'hunyuan-balanced',
  arch: 'hunyuan',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for HunyuanImage 2.1 LoRA. Uses sigma timestep sampling.',
  config: {
    ...hunyuanBase,
    network_dim: 16,
    network_alpha: 8,
    learning_rate: 5e-5,
    max_train_epochs: 10,
    save_every_n_epochs: 2,
  },
  source: 'system'
};

const HUNYUAN_QUALITY: TrainingPreset = {
  id: 'hunyuan-quality',
  arch: 'hunyuan',
  tier: 'quality',
  label: 'Quality',
  description: 'Higher rank HunyuanImage LoRA for best results.',
  config: {
    ...hunyuanBase,
    network_dim: 32,
    network_alpha: 16,
    learning_rate: 2e-5,
    max_train_epochs: 20,
    save_every_n_epochs: 5,
  },
  source: 'system'
};

// ─────────────────────────────────────────────────────────────────────────────
// Master export — all presets in display order
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PRESETS: TrainingPreset[] = [
  // FLUX
  FLUX_FAST, FLUX_BALANCED, FLUX_QUALITY,
  // Chroma
  CHROMA_FAST, CHROMA_BALANCED, CHROMA_QUALITY,
  // SDXL
  SDXL_FAST, SDXL_BALANCED, SDXL_QUALITY,
  // SD1
  SD1_FAST, SD1_BALANCED, SD1_QUALITY,
  // SD2
  SD2_FAST, SD2_BALANCED, SD2_QUALITY,
  // SD3
  SD3_FAST, SD3_BALANCED, SD3_QUALITY,
  // Anima
  ANIMA_FAST, ANIMA_BALANCED, ANIMA_QUALITY,
  // Lumina
  LUMINA_FAST, LUMINA_BALANCED, LUMINA_QUALITY,
  // HunyuanImage
  HUNYUAN_FAST, HUNYUAN_BALANCED, HUNYUAN_QUALITY,
];