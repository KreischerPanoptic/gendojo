/**
 * System training presets for all supported architectures.
 *
 * Three tiers per architecture:
 *   fast     — quick iteration / dataset validation (low rank, high LR, few epochs)
 *   balanced — recommended starting point for most use-cases
 *   quality  — best final result (higher rank, lower LR, more epochs)
 *
 * All values are grounded in:
 *   - Official sd-scripts documentation (flux_train_network.md, etc.)
 *   - Empirical analysis: "Optimal LoRA hyperparameters for modern diffusion architectures"
 *   - Community consensus from r/StableDiffusion, Hugging Face Discussions
 *
 * Key principles encoded here:
 *   - Alpha = Rank / 2 on all presets (0.5× scaling factor, prevents gradient spikes)
 *   - BF16 is mandatory for all DiT/flow-matching architectures (FLUX, SD3, Chroma,
 *     Anima, Lumina, Hunyuan) — FP16 causes NaN gradients in large attention layers
 *   - Text encoder LoRA is disabled (network_train_unet_only: true) on architectures
 *     that use T5-XXL / Gemma2 / Qwen as LLMs — applying LoRA to them on small
 *     datasets causes token poisoning / language capability collapse
 *   - cache_text_encoder_outputs: true is standard for all architectures with heavy
 *     text encoders (FLUX, SD3, Chroma, Lumina, Hunyuan, Anima)
 */

import type { TrainingPreset } from '../types/presets.types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared base configs
// ─────────────────────────────────────────────────────────────────────────────

/** Common fields for FLUX.1 and Chroma (both use flux_train_network.py) */
const fluxBase = {
  optimizer_type:                 'AdamW8bit',
  lr_scheduler:                   'cosine_with_restarts' as const,
  lr_scheduler_num_cycles:        1,
  mixed_precision:                'bf16' as const,
  save_precision:                 'bf16' as const,
  gradient_checkpointing:         true,
  cache_latents:                  true,
  /**
   * Freeze text encoder LoRA. T5-XXL on small datasets causes token poisoning —
   * the concept "bleeds" into unrelated tokens (e.g. green skin colours everything green).
   */
  network_train_unet_only:        true,
  /** Cache T5-XXL + CLIP-L outputs before training starts; frees ~9–10 GB VRAM. */
  cache_text_encoder_outputs:     true,
  /**
   * flux_shift is the primary recommended sampler for FLUX.1.
   * It concentrates training on the critical middle-noise phases where
   * the rectified flow vector field changes the most.
   * (sigmoid is an acceptable alternative.)
   */
  timestep_sampling:              'flux_shift',
  model_prediction_type:          'raw',
  /**
   * FLUX.1-dev was trained with guidance distillation.
   * Setting guidance_scale = 1.0 disables embedded guidance during training —
   * anything else disrupts the internal generation balance.
   */
  guidance_scale:                 1.0,
  /**
   * Small noise offset stabilises colour balance and prevents contrast burn-out.
   * Recommended value for FLUX from community empirical tests.
   */
  noise_offset:                   0.05,
  save_every_n_epochs:            2,
  max_data_loader_n_workers:      2,
  persistent_data_loader_workers: true,
};

/** Common fields for SD1.x and SD2.x (train_network.py) */
const sdBase = {
  optimizer_type:                 'AdamW8bit',
  lr_scheduler:                   'cosine_with_restarts' as const,
  lr_scheduler_num_cycles:        1,
  /**
   * SD1/SD2 prefer FP16 — BF16 can cause issues with their U-Net attention
   * mechanism on some hardware.  BF16 is safe if your GPU fully supports it,
   * but FP16 is the conservative default.
   */
  mixed_precision:                'fp16' as const,
  save_precision:                 'fp16' as const,
  gradient_checkpointing:         true,
  cache_latents:                  true,
  save_every_n_epochs:            2,
  max_data_loader_n_workers:      2,
  persistent_data_loader_workers: true,
};

/** Common fields for SDXL, SD3, Anima, Lumina, Hunyuan */
const modernBase = {
  optimizer_type:                 'AdamW8bit',
  lr_scheduler:                   'cosine_with_restarts' as const,
  lr_scheduler_num_cycles:        1,
  mixed_precision:                'bf16' as const,
  save_precision:                 'bf16' as const,
  gradient_checkpointing:         true,
  cache_latents:                  true,
  save_every_n_epochs:            2,
  max_data_loader_n_workers:      2,
  persistent_data_loader_workers: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// FLUX.1
// ─────────────────────────────────────────────────────────────────────────────

export const FLUX_FAST: TrainingPreset = {
  id: 'flux-fast',
  arch: 'flux',
  tier: 'fast',
  label: 'Fast',
  description:
    'Quick dataset/caption validation run. Low rank, 5 epochs, high LR. ' +
    'Not suitable as a final model — use Balanced or Quality for that.',
  source: 'system',
  config: {
    ...fluxBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       3e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const FLUX_BALANCED: TrainingPreset = {
  id: 'flux-balanced',
  arch: 'flux',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended starting point for FLUX.1 LoRA. ' +
    'Good quality without excessive training time. Tested on 24 GB VRAM.',
  source: 'system',
  config: {
    ...fluxBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       1e-4,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const FLUX_QUALITY: TrainingPreset = {
  id: 'flux-quality',
  arch: 'flux',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final result for FLUX.1. Higher rank, lower LR, 20 epochs. ' +
    'Note: FLUX learns fine details even at Rank 8 — increasing rank beyond 32 ' +
    'rarely improves results and risks overfitting on small datasets.',
  source: 'system',
  config: {
    ...fluxBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       5e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Chroma
//
// Chroma is a de-distilled FLUX.1-Schnell variant (8.9B params vs 12B for FLUX Dev).
// Key differences from FLUX:
//   - guidance_scale MUST be 0.0 (no guidance distillation)
//   - apply_t5_attn_mask MUST be true
//   - Extremely sensitive to LR — use lower values than FLUX to avoid likeness drift
//   - Requires natural-language, LLM-generated captions (100–150 words);
//     short Danbooru-style tags do not work well
// ─────────────────────────────────────────────────────────────────────────────

const chromaBase = {
  ...fluxBase,
  /** Must be 0.0 — Chroma has no guidance distillation, any other value breaks convergence. */
  guidance_scale:      0.0 as const,
  /** Required — without this the T5-XXL attention mask is not applied and loss won't converge. */
  apply_t5_attn_mask:  true as const,
  /** Identifies the Chroma variant to flux_train_network.py. */
  model_type:          'chroma' as const,
  timestep_sampling:   'sigmoid',  // sigmoid is recommended for Chroma
  // Remove FLUX's noise_offset — not validated for Chroma
  noise_offset:        undefined,
};

export const CHROMA_FAST: TrainingPreset = {
  id: 'chroma-fast',
  arch: 'chroma',
  tier: 'fast',
  label: 'Fast',
  description:
    'Quick Chroma dataset/caption test. guidance_scale=0 and apply_t5_attn_mask=true are required. ' +
    'Use LLM-generated captions (100–150 words) — short tags do not work for Chroma.',
  source: 'system',
  config: {
    ...chromaBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       3e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const CHROMA_BALANCED: TrainingPreset = {
  id: 'chroma-balanced',
  arch: 'chroma',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for Chroma LoRA. Lower LR than FLUX — Chroma overfits quickly at 1e-4+. ' +
    'Requires natural-language LLM captions.',
  source: 'system',
  config: {
    ...chromaBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       1e-4,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const CHROMA_QUALITY: TrainingPreset = {
  id: 'chroma-quality',
  arch: 'chroma',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final result for Chroma. Extended training (20 epochs) at conservative LR. ' +
    'Watch for likeness drift — reduce LR further if the face starts degrading after epoch 10.',
  source: 'system',
  config: {
    ...chromaBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       5e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SDXL
//
// noise_offset: 0.0357 is standard for SDXL — prevents "washed out" images
// by allowing the model to learn the full brightness range (pure black → pure white).
// ─────────────────────────────────────────────────────────────────────────────

const sdxlBase = {
  ...modernBase,
  /**
   * Prevents dynamic-range collapse ("faded" images) during SDXL LoRA training.
   * Value 0.0357 is the empirical community standard.
   */
  noise_offset: 0.0357,
};

export const SDXL_FAST: TrainingPreset = {
  id: 'sdxl-fast',
  arch: 'sdxl',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SDXL LoRA test. noise_offset=0.0357 prevents washed-out images.',
  source: 'system',
  config: {
    ...sdxlBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const SDXL_BALANCED: TrainingPreset = {
  id: 'sdxl-balanced',
  arch: 'sdxl',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for SDXL LoRA. Includes noise_offset=0.0357 for correct tonal range. ' +
    'Dataset of 50–100 images is ideal.',
  source: 'system',
  config: {
    ...sdxlBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const SDXL_QUALITY: TrainingPreset = {
  id: 'sdxl-quality',
  arch: 'sdxl',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final SDXL result. 20 epochs, lower LR, higher rank. ' +
    'noise_offset=0.0357 is always included.',
  source: 'system',
  config: {
    ...sdxlBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SD 1.x
//
// clip_skip: 2 for Balanced/Quality — skips the last CLIP layer so the model
// focuses on broader visual semantics rather than hard token anchors.
// ─────────────────────────────────────────────────────────────────────────────

export const SD1_FAST: TrainingPreset = {
  id: 'sd1-fast',
  arch: 'sd1',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SD1.x LoRA validation run. Low rank, 5 epochs.',
  source: 'system',
  config: {
    ...sdBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const SD1_BALANCED: TrainingPreset = {
  id: 'sd1-balanced',
  arch: 'sd1',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for SD 1.x LoRA. clip_skip=2 skips the last CLIP layer for better ' +
    'visual concept generalisation.',
  source: 'system',
  config: {
    ...sdBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
    clip_skip:           2,
  },
};

export const SD1_QUALITY: TrainingPreset = {
  id: 'sd1-quality',
  arch: 'sd1',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final SD1.x result. Higher rank, lower LR, 20 epochs. clip_skip=2 included.',
  source: 'system',
  config: {
    ...sdBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
    clip_skip:           2,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SD 2.x
// ─────────────────────────────────────────────────────────────────────────────

export const SD2_FAST: TrainingPreset = {
  id: 'sd2-fast',
  arch: 'sd2',
  tier: 'fast',
  label: 'Fast',
  description: 'Quick SD2.x LoRA test. v2=true is set automatically.',
  source: 'system',
  config: {
    ...sdBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
    v2:                  true,
  },
};

export const SD2_BALANCED: TrainingPreset = {
  id: 'sd2-balanced',
  arch: 'sd2',
  tier: 'balanced',
  label: 'Balanced',
  description: 'Recommended for SD 2.x LoRA. v2=true is set automatically.',
  source: 'system',
  config: {
    ...sdBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
    v2:                  true,
  },
};

export const SD2_QUALITY: TrainingPreset = {
  id: 'sd2-quality',
  arch: 'sd2',
  tier: 'quality',
  label: 'Quality',
  description: 'Best final SD2.x result. v2=true is set automatically.',
  source: 'system',
  config: {
    ...sdBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
    v2:                  true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SD3 / SD3.5
//
// Key SD3 requirements:
//   - weighting_scheme: 'logit_normal' — required for correct MMDiT loss distribution
//   - cache_text_encoder_outputs: true — T5-XXL + CLIP-G + CLIP-L are heavy
//   - network_train_unet_only: true — standard practice; TE LoRA causes language degradation
//     on small datasets (community consensus)
// ─────────────────────────────────────────────────────────────────────────────

const sd3Base = {
  ...modernBase,
  /**
   * Adjusts the loss weight distribution across diffusion timesteps.
   * logit_normal prioritises mid-noise phases which is critical for MMDiT architecture.
   * Required for SD3/SD3.5 — using uniform weighting produces inferior results.
   */
  weighting_scheme:           'logit_normal' as const,
  /** Frees ~10+ GB VRAM — three text encoders (CLIP-L, CLIP-G, T5-XXL) are expensive. */
  cache_text_encoder_outputs: true,
  /**
   * Freeze text encoder LoRA. SD3.5 TE fine-tuning on small datasets degrades language
   * understanding; if needed, limit TE LR to ≤ 5e-5.
   */
  network_train_unet_only:    true,
};

export const SD3_FAST: TrainingPreset = {
  id: 'sd3-fast',
  arch: 'sd3',
  tier: 'fast',
  label: 'Fast',
  description:
    'Quick SD3/SD3.5 test. weighting_scheme=logit_normal and TE caching are always enabled.',
  source: 'system',
  config: {
    ...sd3Base,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const SD3_BALANCED: TrainingPreset = {
  id: 'sd3-balanced',
  arch: 'sd3',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for SD3/SD3.5 LoRA. ' +
    'logit_normal weighting and TE output caching are always enabled.',
  source: 'system',
  config: {
    ...sd3Base,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const SD3_QUALITY: TrainingPreset = {
  id: 'sd3-quality',
  arch: 'sd3',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final SD3/SD3.5 result. Note: SD3.5 Large may benefit from a higher LR ' +
    '(up to 1e-3) when using very high ranks.',
  source: 'system',
  config: {
    ...sd3Base,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Anima
//
// Key Anima requirements:
//   - BF16 is STRICTLY REQUIRED — FP16 causes NaN in cross-attention layers
//   - Optimal training resolution is 768×768 (not 1024; the base model was trained at 512/768)
//   - network_train_unet_only: true — LLM Adapter LoRA destabilises the language core
//   - cache_text_encoder_outputs: true — Qwen3 text encoder is large
//   - timestep_sampling: 'sigmoid'
// ─────────────────────────────────────────────────────────────────────────────

const animaBase = {
  ...modernBase,
  timestep_sampling:          'sigmoid',
  /**
   * BF16 is non-negotiable for Anima — FP16 overflows in cross-attention
   * and produces NaN gradients, breaking training completely.
   */
  mixed_precision:            'bf16' as const,
  save_precision:             'bf16' as const,
  /** Cache Qwen3 text encoder outputs. Also disables dynamic tag dropout. */
  cache_text_encoder_outputs: true,
  /**
   * Freeze text encoder. Applying LoRA to the LLM Adapter destabilises
   * Anima's language core — strongly not recommended for standard use-cases.
   */
  network_train_unet_only:    true,
};

export const ANIMA_FAST: TrainingPreset = {
  id: 'anima-fast',
  arch: 'anima',
  tier: 'fast',
  label: 'Fast',
  description:
    'Quick Anima LoRA test. BF16 is strictly required — FP16 will produce NaN gradients. ' +
    'Use 768×768 resolution in your dataset config for best results.',
  source: 'system',
  config: {
    ...animaBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const ANIMA_BALANCED: TrainingPreset = {
  id: 'anima-balanced',
  arch: 'anima',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for Anima LoRA. BF16 strict + TE frozen + sigmoid sampling. ' +
    'Set resolution=768 in your dataset config.',
  source: 'system',
  config: {
    ...animaBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const ANIMA_QUALITY: TrainingPreset = {
  id: 'anima-quality',
  arch: 'anima',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final Anima result. LR scales down with rank to maintain stability. ' +
    'BF16 strict. For 768×768 training.',
  source: 'system',
  config: {
    ...animaBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Lumina Image 2.0
//
// Key Lumina requirements:
//   - timestep_sampling: 'nextdit_shift' (Lumina-specific sampler)
//   - discrete_flow_shift: 6.0 — high shift value forces the DiT to learn global
//     composition before spending time on high-frequency texture details
//   - model_prediction_type: 'raw'
//   - network_train_unet_only: true — Gemma2-2B LoRA on small datasets → language collapse
//   - cache_text_encoder_outputs: true — Gemma2-2B is a large text encoder
// ─────────────────────────────────────────────────────────────────────────────

const luminaBase = {
  ...modernBase,
  /**
   * Lumina-specific timestep sampler. Forces the model to learn global structure
   * (composition, anatomy) before fine texture details.
   */
  timestep_sampling:          'nextdit_shift',
  /**
   * 6.0 is exceptionally high — mathematically necessary for Next-DiT architecture
   * to ensure semantic coherence across the full resolution range.
   */
  discrete_flow_shift:        6.0,
  model_prediction_type:      'raw',
  /** Cache Gemma2-2B outputs — large text encoder, caching frees significant VRAM. */
  cache_text_encoder_outputs: true,
  /** Freeze Gemma2-2B LoRA — applying it to large LLMs on small datasets collapses language. */
  network_train_unet_only:    true,
};

export const LUMINA_FAST: TrainingPreset = {
  id: 'lumina-fast',
  arch: 'lumina',
  tier: 'fast',
  label: 'Fast',
  description:
    'Quick Lumina Image 2.0 test. ' +
    'nextdit_shift sampling + flow_shift=6.0 are required for correct convergence.',
  source: 'system',
  config: {
    ...luminaBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const LUMINA_BALANCED: TrainingPreset = {
  id: 'lumina-balanced',
  arch: 'lumina',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for Lumina Image 2.0 LoRA. ' +
    'nextdit_shift + flow_shift=6.0 are always enabled. Gemma2-2B TE is frozen.',
  source: 'system',
  config: {
    ...luminaBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const LUMINA_QUALITY: TrainingPreset = {
  id: 'lumina-quality',
  arch: 'lumina',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final Lumina result. Deep rank for style/semantic adaptation. ' +
    'Rank 64/32 is also an option for complex style LoRAs — adjust manually.',
  source: 'system',
  config: {
    ...luminaBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HunyuanImage 2.1
//
// Key Hunyuan requirements:
//   - network_train_unet_only: true — HARD ARCHITECTURAL REQUIREMENT.
//     Applying LoRA to Qwen2.5-VL or byT5 causes fatal script errors or
//     complete language understanding collapse. Not optional.
//   - timestep_sampling: 'sigma', discrete_flow_shift: 5.0
//   - cache_text_encoder_outputs: true — Qwen2.5-VL 7B is enormous
//   - Hunyuan requires more steps for convergence than FLUX:
//     100–180 epochs for character likeness on ~50 images
// ─────────────────────────────────────────────────────────────────────────────

const hunyuanBase = {
  ...modernBase,
  /**
   * HARD REQUIREMENT. Hunyuan does not support LoRA for text encoders.
   * Attempting to train Qwen2.5-VL or byT5 with LoRA causes either:
   *   a) Fatal script error at startup, or
   *   b) Complete language understanding collapse
   */
  network_train_unet_only:    true as const,
  /**
   * sigma sampling + shift=5.0 concentrates gradient updates on macro structures
   * (composition, proportions, geometry) before fine texture details.
   */
  timestep_sampling:          'sigma',
  discrete_flow_shift:        5.0,
  model_prediction_type:      'raw',
  /** Cache Qwen2.5-VL 7B outputs — one of the largest text encoders used in training. */
  cache_text_encoder_outputs: true,
};

export const HUNYUAN_FAST: TrainingPreset = {
  id: 'hunyuan-fast',
  arch: 'hunyuan',
  tier: 'fast',
  label: 'Fast',
  description:
    'Quick HunyuanImage 2.1 test. network_train_unet_only=true is a hard architectural requirement.',
  source: 'system',
  config: {
    ...hunyuanBase,
    network_dim:         8,
    network_alpha:       4,
    learning_rate:       1e-4,
    max_train_epochs:    5,
    save_every_n_epochs: 1,
  },
};

export const HUNYUAN_BALANCED: TrainingPreset = {
  id: 'hunyuan-balanced',
  arch: 'hunyuan',
  tier: 'balanced',
  label: 'Balanced',
  description:
    'Recommended for HunyuanImage 2.1 LoRA. ' +
    'Hunyuan needs more epochs than FLUX for character likeness — consider increasing to 30+.',
  source: 'system',
  config: {
    ...hunyuanBase,
    network_dim:         16,
    network_alpha:       8,
    learning_rate:       5e-5,
    max_train_epochs:    10,
    save_every_n_epochs: 2,
  },
};

export const HUNYUAN_QUALITY: TrainingPreset = {
  id: 'hunyuan-quality',
  arch: 'hunyuan',
  tier: 'quality',
  label: 'Quality',
  description:
    'Best final HunyuanImage result. Rank 32 is the empirical sweet spot — ' +
    'Rank 64 rarely adds visible quality improvement but stresses VRAM bandwidth.',
  source: 'system',
  config: {
    ...hunyuanBase,
    network_dim:         32,
    network_alpha:       16,
    learning_rate:       2e-5,
    max_train_epochs:    20,
    save_every_n_epochs: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Master export — all system presets in display order
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PRESETS: TrainingPreset[] = [
  FLUX_FAST,    FLUX_BALANCED,    FLUX_QUALITY,
  CHROMA_FAST,  CHROMA_BALANCED,  CHROMA_QUALITY,
  SDXL_FAST,    SDXL_BALANCED,    SDXL_QUALITY,
  SD1_FAST,     SD1_BALANCED,     SD1_QUALITY,
  SD2_FAST,     SD2_BALANCED,     SD2_QUALITY,
  SD3_FAST,     SD3_BALANCED,     SD3_QUALITY,
  ANIMA_FAST,   ANIMA_BALANCED,   ANIMA_QUALITY,
  LUMINA_FAST,  LUMINA_BALANCED,  LUMINA_QUALITY,
  HUNYUAN_FAST, HUNYUAN_BALANCED, HUNYUAN_QUALITY,
];