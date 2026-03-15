import { ModelArchitecture, ModelRole, ModelType } from '../types/models.types';

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
 */
export const CLASSIFY_RULES: ClassifyRule[] = [

  // ── LoRA / LyCORIS adapters ───────────────────────────────────────────────
  { pattern: /\blora\b/,       arch: 'unknown', role: 'lora' },
  { pattern: /\blycori[s]?\b/, arch: 'unknown', role: 'lora' },

  // ── Shared directory — set role by path, arch stays 'unknown' ────────────
  //
  // Files in shared/ are physically shared across multiple architectures.
  // Role is resolved from the subdirectory name; filename rules below refine
  // the specific role (t5xxl vs clip_l, etc.).

  // shared/ae/ — always AE regardless of filename
  { pattern: /^shared\/ae\//,             arch: 'unknown', role: 'ae'  },
  { pattern: /\/shared\/ae\//,            arch: 'unknown', role: 'ae'  },

  // shared/text_encoders/ — role resolved by filename rules below
  { pattern: /^shared\/text_encoders\//,  arch: 'unknown', role: 'unknown' },
  { pattern: /\/shared\/text_encoders\//, arch: 'unknown', role: 'unknown' },

  // shared/vae/ — always VAE
  { pattern: /^shared\/vae\//,            arch: 'unknown', role: 'vae' },
  { pattern: /\/shared\/vae\//,           arch: 'unknown', role: 'vae' },

  // ── Text encoders — identified by filename ────────────────────────────────

  { pattern: /\bclip[_-]?l\b/,                     arch: 'unknown',  role: 'clip_l'     },
  { pattern: /\bclip[_-]?g\b/,                     arch: 'unknown',  role: 'clip_g'     },
  { pattern: /t5[_-]?xxl/,                         arch: 'unknown',  role: 't5xxl'      },
  { pattern: /gemma[_-]?2/,                        arch: 'lumina',   role: 'gemma2'     },
  { pattern: /\bqwen_3/,                            arch: 'anima',    role: 'qwen3'      },
  { pattern: /qwen[_-]?2[._-]?5[._-]?vl/,         arch: 'hunyuan',  role: 'qwen2_5_vl' },
  { pattern: /\bbyt5/,                             arch: 'hunyuan',  role: 'byt5'       },
  { pattern: /llm[_-]?adapter/,                    arch: 'anima',    role: 'llm_adapter'},

  // ── VAE / AE — before generic arch checks ─────────────────────────────────

  // ae.safetensors (bare "ae" basename) — arch resolved by folder
  { pattern: /(?:^|\/)ae\.[a-z]+$/, arch: 'unknown', role: 'ae' },

  // Explicit Lumina AE
  { pattern: /lumina[^/]*ae|ae[^/]*lumina/, arch: 'lumina', role: 'ae' },

  // Explicit FLUX AE
  { pattern: /flux[^/]*ae|ae[^/]*flux/,     arch: 'flux',   role: 'ae' },

  // Anima Qwen-Image VAE
  { pattern: /qwen[_-]?image[_-]?vae|vae[_-]?qwen/, arch: 'anima', role: 'vae' },

  // Architecture-specific VAEs
  { pattern: /hunyuan[^/]*vae|vae[^/]*hunyuan/, arch: 'hunyuan', role: 'vae' },
  { pattern: /sd3[^/]*vae|vae[^/]*sd3/,         arch: 'sd3',     role: 'vae' },
  { pattern: /sdxl[^/]*vae|vae[^/]*sdxl|xl[_-]?vae/, arch: 'sdxl', role: 'vae' },

  // Generic VAE (arch resolved by folder rules below)
  { pattern: /\bvae\b/, arch: 'unknown', role: 'vae' },

  // ── Base models (DiT / checkpoint) ────────────────────────────────────────

  // Chroma — must come before generic FLUX rule (Chroma files often contain "flux" in path)
  { pattern: /\bchroma\b/, arch: 'chroma', role: 'dit' },

  // FLUX.1
  { pattern: /flux[._-]?1|flux[._-]?(?:dev|schnell)/, arch: 'flux', role: 'dit' },

  // SD3.5 (before SD3 — more specific)
  { pattern: /sd[._-]?3[._-]?5|sd3[._-]?5/, arch: 'sd3', role: 'dit' },

  // SD3
  { pattern: /\bsd[._-]?3\b|sd3_(?:medium|large)/, arch: 'sd3', role: 'dit' },

  // HunyuanImage
  { pattern: /hunyuan[._-]?image|hunyuanimage|hunyuandit/, arch: 'hunyuan', role: 'dit' },

  // Lumina Image 2.0
  { pattern: /lumina[._-]?(?:image|next|2)/, arch: 'lumina', role: 'dit' },

  // Anima DiT
  { pattern: /\banima\b/, arch: 'anima', role: 'dit' },

  // SDXL checkpoint
  { pattern: /sdxl|sd[_-]?xl|xl[_-]?base/, arch: 'sdxl', role: 'checkpoint' },

  // SD2 checkpoint
  { pattern: /v2[._-]?[01]|sd[._-]?2[._-]|stable[_-]?diffusion[._-]?2/, arch: 'sd2', role: 'checkpoint' },

  // SD1 checkpoint
  { pattern: /v1[._-]?[45]|sd[._-]?1[._-]|stable[_-]?diffusion[._-]?v?1/, arch: 'sd1', role: 'checkpoint' },

  // ── Folder-based architecture hints (weak signal — placed last) ───────────
  //
  // Shared/ paths are handled above — these cover arch-specific folders.
  // Note: /flux/ must NOT match chroma/ files even if they live in flux/;
  // Chroma DiT is now in chroma/ so this is no longer an issue.

  { pattern: /\/flux\//,    arch: 'flux',    role: 'unknown' },
  { pattern: /\/chroma\//,  arch: 'chroma',  role: 'unknown' },
  { pattern: /\/sd3\//,     arch: 'sd3',     role: 'unknown' },
  { pattern: /\/sdxl\//,    arch: 'sdxl',    role: 'unknown' },
  { pattern: /\/anima\//,   arch: 'anima',   role: 'unknown' },
  { pattern: /\/lumina\//,  arch: 'lumina',  role: 'unknown' },
  { pattern: /\/hunyuan\//, arch: 'hunyuan', role: 'unknown' },

  // Root-level folder names (path doesn't start with /)
  { pattern: /^flux\//,     arch: 'flux',    role: 'unknown' },
  { pattern: /^chroma\//,   arch: 'chroma',  role: 'unknown' },
  { pattern: /^sd3\//,      arch: 'sd3',     role: 'unknown' },
  { pattern: /^sdxl\//,     arch: 'sdxl',    role: 'unknown' },
  { pattern: /^anima\//,    arch: 'anima',   role: 'unknown' },
  { pattern: /^lumina\//,   arch: 'lumina',  role: 'unknown' },
  { pattern: /^hunyuan\//,  arch: 'hunyuan', role: 'unknown' },
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