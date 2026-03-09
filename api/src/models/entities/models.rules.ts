// ─────────────────────────────────────────────────────────────────────────────
// Classification rules
// ─────────────────────────────────────────────────────────────────────────────

import { ModelArchitecture, ModelRole, ModelType } from "./models.types";

export interface ClassifyRule {
  /**
   * Tested against the full relative path, lowercased, with forward slashes.
   * Both the folder structure AND the filename contribute to detection.
   */
  pattern: RegExp;
  arch: ModelArchitecture;
  role: ModelRole;
}

/**
 * Rules are evaluated in a single pass. Both `arch` and `role` accumulate
 * independently — the first rule that resolves each field wins.
 * More-specific patterns must appear before generic ones.
 *
 * See `classify()` for the accumulation logic.
 */
export const CLASSIFY_RULES: ClassifyRule[] = [
  // ── LoRA / LyCORIS adapters ───────────────────────────────────────────────
  // Strong signal from folder name or filename prefix; check early.
  { pattern: /\blora\b/,           arch: 'unknown', role: 'lora' },
  { pattern: /\blycori[s]?\b/,     arch: 'unknown', role: 'lora' },

  // ── Text encoders — identified by filename, before generic arch checks ────

  // CLIP-L: shared by FLUX, SD3, SDXL (SDXL bundles it inside the checkpoint,
  // but can also appear as a separate file in custom setups).
  { pattern: /\bclip[_-]?l\b/,    arch: 'unknown',  role: 'clip_l' },

  // CLIP-G: used by SD3 (explicit --clip_g) and embedded in SDXL checkpoints.
  { pattern: /\bclip[_-]?g\b/,    arch: 'unknown',  role: 'clip_g' },

  // T5-XXL: shared by FLUX and SD3; Anima only uses T5 tokenizer, not weights.
  { pattern: /t5[_-]?xxl/,        arch: 'unknown',  role: 't5xxl' },

  // Gemma2 — exclusively Lumina Image 2.0
  { pattern: /gemma[_-]?2/,       arch: 'lumina',   role: 'gemma2' },

  // Qwen3 — exclusively Anima (--qwen3)
  { pattern: /\bqwen3/,    arch: 'anima', role: 'qwen3' }, 

  // Qwen2.5-VL — HunyuanImage (--text_encoder)
  // Matches: qwen_2.5_vl, qwen2.5-vl, qwen-2-5-vl, qwen2_5_vl_7b, etc.
  { pattern: /qwen[_-]?2[._-]?5[._-]?vl/, arch: 'hunyuan', role: 'qwen2_5_vl' },

  // byT5 — HunyuanImage (--byt5)
  { pattern: /\bbyt5/,            arch: 'hunyuan',  role: 'byt5' },

  // LLM Adapter — Anima bridge module (--llm_adapter_path, optional)
  { pattern: /llm[_-]?adapter/,   arch: 'anima',    role: 'llm_adapter' },

  // ── VAE / AE — before generic arch checks ─────────────────────────────────

  // ae.safetensors (basename exactly "ae") — used by both FLUX and Lumina.
  // Arch stays 'unknown' since the same file is reused; folder context (below)
  // will resolve arch if placed in flux/ or lumina/ subdirectory.
  { pattern: /(?:^|\/)ae\.[a-z]+$/, arch: 'unknown',  role: 'ae' },

  // Lumina AE with explicit label
  { pattern: /lumina[^/]*ae|ae[^/]*lumina/, arch: 'lumina', role: 'ae' },

  // FLUX AE with explicit label
  { pattern: /flux[^/]*ae|ae[^/]*flux/,     arch: 'flux',   role: 'ae' },

  // Anima Qwen-Image VAE
  { pattern: /qwen[_-]?image[_-]?vae|vae[_-]?qwen/, arch: 'anima', role: 'vae' },

  // Architecture-specific VAEs
  { pattern: /hunyuan[^/]*vae|vae[^/]*hunyuan/, arch: 'hunyuan', role: 'vae' },
  { pattern: /sd3[^/]*vae|vae[^/]*sd3/,         arch: 'sd3',     role: 'vae' },
  { pattern: /sdxl[^/]*vae|vae[^/]*sdxl|xl[_-]?vae/, arch: 'sdxl', role: 'vae' },

  // Generic VAE folder or filename (arch resolved by folder rules below)
  { pattern: /\bvae\b/,           arch: 'unknown',  role: 'vae' },

  // ── Base models (DiT / checkpoint) ────────────────────────────────────────

  // Chroma — FLUX variant (must be before generic FLUX rule)
  { pattern: /\bchroma\b/,        arch: 'chroma',   role: 'dit' },

  // FLUX.1 — matches: flux1-dev, flux1-schnell, flux_dev, flux-dev, etc.
  { pattern: /flux[._-]?1|flux[._-]?(?:dev|schnell)/, arch: 'flux', role: 'dit' },

  // SD3.5 before SD3 (more specific)
  { pattern: /sd[._-]?3[._-]?5|sd3[._-]?5/, arch: 'sd3', role: 'dit' },

  // SD3 / SD3 Medium / SD3 Large
  { pattern: /\bsd[._-]?3\b|sd3_(?:medium|large)/, arch: 'sd3', role: 'dit' },

  // HunyuanImage
  { pattern: /hunyuan[._-]?image|hunyuanimage|hunyuandit/, arch: 'hunyuan', role: 'dit' },

  // Lumina Image 2.0 — matches: lumina-image-2, lumina_2_model, lumina_next
  { pattern: /lumina[._-]?(?:image|next|2)/,  arch: 'lumina',  role: 'dit' },

  // Anima DiT base model
  // Matches: Anima-Preview, anima_dit, anima_base, Anima.safetensors
  { pattern: /\banima\b/,         arch: 'anima',    role: 'dit' },

  // SDXL checkpoint (single merged file)
  { pattern: /sdxl|sd[_-]?xl|xl[_-]?base/, arch: 'sdxl', role: 'checkpoint' },

  // SD2 checkpoint
  { pattern: /v2[._-]?[01]|sd[._-]?2[._-]|stable[_-]?diffusion[._-]?2/, arch: 'sd2', role: 'checkpoint' },

  // SD1 checkpoint (v1-5-pruned, sd_v1-4, etc.)
  { pattern: /v1[._-]?[45]|sd[._-]?1[._-]|stable[_-]?diffusion[._-]?v?1/, arch: 'sd1', role: 'checkpoint' },

  // ── Folder-based architecture hints ───────────────────────────────────────
  // These only set arch — role stays unknown if not already resolved.
  // Placed last because they are weaker signals (just folder names).
  { pattern: /\/flux\//,          arch: 'flux',    role: 'unknown' },
  { pattern: /\/chroma\//,        arch: 'chroma',  role: 'unknown' },
  { pattern: /\/sd3\//,           arch: 'sd3',     role: 'unknown' },
  { pattern: /\/sdxl\//,          arch: 'sdxl',    role: 'unknown' },
  { pattern: /\/anima\//,         arch: 'anima',   role: 'unknown' },
  { pattern: /\/lumina\//,        arch: 'lumina',  role: 'unknown' },
  { pattern: /\/hunyuan\//,       arch: 'hunyuan', role: 'unknown' },
  // Root-level folder name (path doesn't start with /)
  { pattern: /^flux\//,           arch: 'flux',    role: 'unknown' },
  { pattern: /^chroma\//,         arch: 'chroma',  role: 'unknown' },
  { pattern: /^sd3\//,            arch: 'sd3',     role: 'unknown' },
  { pattern: /^sdxl\//,           arch: 'sdxl',    role: 'unknown' },
  { pattern: /^anima\//,          arch: 'anima',   role: 'unknown' },
  { pattern: /^lumina\//,         arch: 'lumina',  role: 'unknown' },
  { pattern: /^hunyuan\//,        arch: 'hunyuan', role: 'unknown' },
];

/** Map granular role → coarse ModelType for backwards-compatible filtering */
export const ROLE_TO_TYPE: Readonly<Record<ModelRole, ModelType>> = {
  checkpoint:   'checkpoint',
  dit:          'checkpoint',
  unet:         'checkpoint',
  lora:         'lora',
  vae:          'vae',
  ae:           'vae',
  clip_l:       'text_encoder',
  clip_g:       'text_encoder',
  t5xxl:        'text_encoder',
  gemma2:       'text_encoder',
  qwen3:        'text_encoder',
  qwen2_5_vl:   'text_encoder',
  byt5:         'text_encoder',
  llm_adapter:  'unknown',
  text_encoder: 'text_encoder',
  unknown:      'unknown',
};