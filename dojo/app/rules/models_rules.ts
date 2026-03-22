import type { ModelRole } from '#types/models'
import { ModelArchitecture } from '#contracts/enums'

export interface ClassifyRule {
  /**
   * Tested against the full relative path, lowercased, with forward slashes.
   * Both the folder structure AND the filename contribute to detection.
   */
  pattern: RegExp
  arch: ModelArchitecture | null
  role: ModelRole | null
}

/**
 * Rules are evaluated in a single pass. Both `arch` and `role` accumulate
 * independently — the first rule that resolves each field wins.
 * More-specific patterns must appear before generic ones.
 */
export const CLASSIFY_RULES: ClassifyRule[] = [
  // ── Shared directory — set role by path, arch stays *null* ────────────
  //
  // Files in shared/ are physically shared across multiple architectures.
  // Role is resolved from the subdirectory name; filename rules below refine
  // the specific role (t5xxl vs clip_l, etc.).

  // shared/ae/ — always AE regardless of filename
  { pattern: /^shared\/ae\//, arch: null, role: 'ae' },
  { pattern: /\/shared\/ae\//, arch: null, role: 'ae' },

  // shared/text_encoders/ — role resolved by filename rules below
  { pattern: /^shared\/text_encoders\//, arch: null, role: null },
  { pattern: /\/shared\/text_encoders\//, arch: null, role: null },

  // shared/vae/ — always VAE
  { pattern: /^shared\/vae\//, arch: null, role: 'vae' },
  { pattern: /\/shared\/vae\//, arch: null, role: 'vae' },

  // ── Text encoders — identified by filename ────────────────────────────────

  { pattern: /\bclip[_-]?l\b/, arch: null, role: 'clip_l' },
  { pattern: /\bclip[_-]?g\b/, arch: null, role: 'clip_g' },
  { pattern: /t5[_-]?xxl/, arch: null, role: 't5xxl' },
  { pattern: /gemma[_-]?2/, arch: ModelArchitecture.Lumina2, role: 'gemma2' },
  { pattern: /\bqwen_3/, arch: ModelArchitecture.Anima, role: 'qwen3' },
  { pattern: /qwen[_-]?2[._-]?5[._-]?vl/, arch: ModelArchitecture.Hunyuan2_1, role: 'qwen2_5_vl' },
  { pattern: /\bbyt5/, arch: ModelArchitecture.Hunyuan2_1, role: 'byt5' },
  { pattern: /llm[_-]?adapter/, arch: ModelArchitecture.Anima, role: 'llm_adapter' },

  // ── VAE / AE — before generic arch checks ─────────────────────────────────

  // ae.safetensors (bare "ae" basename) — arch resolved by folder
  { pattern: /(?:^|\/)ae\.[a-z]+$/, arch: null, role: 'ae' },

  // Explicit Lumina AE
  { pattern: /lumina[^/]*ae|ae[^/]*lumina/, arch: ModelArchitecture.Lumina2, role: 'ae' },

  // Explicit FLUX AE
  { pattern: /flux[^/]*ae|ae[^/]*flux/, arch: ModelArchitecture.FLUX_1, role: 'ae' },

  // Anima Qwen-Image VAE
  { pattern: /qwen[_-]?image[_-]?vae|vae[_-]?qwen/, arch: ModelArchitecture.Anima, role: 'vae' },

  // Architecture-specific VAEs
  { pattern: /hunyuan[^/]*vae|vae[^/]*hunyuan/, arch: ModelArchitecture.Hunyuan2_1, role: 'vae' },
  { pattern: /sd3[^/]*vae|vae[^/]*sd3/, arch: ModelArchitecture.SD3, role: 'vae' },
  { pattern: /sdxl[^/]*vae|vae[^/]*sdxl|xl[_-]?vae/, arch: ModelArchitecture.SDXL, role: 'vae' },

  // Generic VAE (arch resolved by folder rules below)
  { pattern: /\bvae\b/, arch: null, role: 'vae' },

  // ── Base models (DiT / checkpoint) ────────────────────────────────────────

  // Chroma — must come before generic FLUX rule (Chroma files often contain "flux" in path)
  { pattern: /\bchroma\b/, arch: ModelArchitecture.Chroma, role: 'dit' },

  // FLUX.1
  { pattern: /flux[._-]?1|flux[._-]?(?:dev|schnell)/, arch: ModelArchitecture.FLUX_1, role: 'dit' },

  // SD3.5 (before SD3 — more specific)
  { pattern: /sd[._-]?3[._-]?5|sd3[._-]?5/, arch: ModelArchitecture.SD3, role: 'dit' },

  // SD3
  // NEW: Catch merged SD3 files first!
  // If it says "incl_clips" or "incl_t5", it is a fully assembled checkpoint.
  { pattern: /sd3.*incl_clips_t5/, arch: ModelArchitecture.SD3, role: 'checkpoint' },

  // Generic SD3 (Naked DiT) - This catches 'sd3_medium.safetensors'
  { pattern: /\bsd[._-]?3\b|sd3_(?:medium|large)/, arch: ModelArchitecture.SD3, role: 'dit' },

  // HunyuanImage
  {
    pattern: /hunyuan[._-]?image|hunyuanimage|hunyuandit/,
    arch: ModelArchitecture.Hunyuan2_1,
    role: 'dit',
  },

  // Lumina Image 2.0
  { pattern: /lumina[._-]?(?:image|next|2)/, arch: ModelArchitecture.Lumina2, role: 'dit' },

  // Anima DiT
  { pattern: /\banima\b/, arch: ModelArchitecture.Anima, role: 'dit' },

  // SDXL checkpoint
  { pattern: /sdxl|sd[_-]?xl|xl[_-]?base/, arch: ModelArchitecture.SDXL, role: 'checkpoint' },

  // SD2 checkpoint
  {
    pattern: /v2[._-]?[01]|sd[._-]?2[._-]|stable[_-]?diffusion[._-]?2/,
    arch: ModelArchitecture.SD2,
    role: 'checkpoint',
  },

  // SD1 checkpoint
  {
    pattern: /v1[._-]?[45]|sd[._-]?1[._-]|stable[_-]?diffusion[._-]?v?1/,
    arch: ModelArchitecture.SD1,
    role: 'checkpoint',
  },

  // ── Folder-based architecture hints (weak signal — placed last) ───────────

  { pattern: /(?:^|\/)flux\//, arch: ModelArchitecture.FLUX_1, role: null },
  { pattern: /(?:^|\/)chroma\//, arch: ModelArchitecture.Chroma, role: null },
  { pattern: /(?:^|\/)sd1\//, arch: ModelArchitecture.SD1, role: null },
  { pattern: /(?:^|\/)sd2\//, arch: ModelArchitecture.SD2, role: null },
  { pattern: /(?:^|\/)sdxl\//, arch: ModelArchitecture.SDXL, role: null },
  { pattern: /(?:^|\/)sd3\//, arch: ModelArchitecture.SD3, role: null },
  { pattern: /(?:^|\/)anima\//, arch: ModelArchitecture.Anima, role: null },
  { pattern: /(?:^|\/)lumina\//, arch: ModelArchitecture.Lumina2, role: null },
  { pattern: /(?:^|\/)hunyuan\//, arch: ModelArchitecture.Hunyuan2_1, role: null },
]
