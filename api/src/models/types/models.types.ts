// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported model architectures for training.
 * Does NOT include 'unknown' — that is handled separately via sharedWith.
 */
export type ModelArchitecture =
  | 'sd1'
  | 'sd2'
  | 'sdxl'
  | 'flux'
  | 'chroma'  // FLUX variant — no CLIP-L, guidance_scale=0
  | 'sd3'
  | 'anima'
  | 'lumina'
  | 'hunyuan'
  | 'unknown';

/**
 * Granular role this file plays in a training configuration.
 *
 * Maps to CLI arguments as follows:
 *   checkpoint / dit / unet → --pretrained_model_name_or_path
 *   vae                     → --vae
 *   ae                      → --ae              (FLUX, Lumina)
 *   clip_l                  → --clip_l           (FLUX, SD3)
 *   clip_g                  → --clip_g           (SD3 only; SDXL uses it internally)
 *   t5xxl                   → --t5xxl            (FLUX, SD3)
 *   gemma2                  → --gemma2           (Lumina)
 *   qwen3                   → --qwen3            (Anima)
 *   qwen2_5_vl              → --text_encoder     (HunyuanImage)
 *   byt5                    → --byt5             (HunyuanImage)
 *   llm_adapter             → --llm_adapter_path (Anima, optional)
 */
export type ModelRole =
  | 'checkpoint'    // Merged SD1/SD2 base (U-Net + TE + VAE in one file)
  | 'dit'           // Diffusion Transformer base (FLUX, SD3 MMDiT, Anima MiniTrainDIT, Lumina Next-DiT, HunyuanImage DiT)
  | 'unet'          // Standalone U-Net weights
  | 'lora'          // LoRA / LyCORIS adapter
  | 'vae'           // Variational AutoEncoder (SD1/SD2/SDXL/SD3/Anima/HunyuanImage)
  | 'ae'            // AutoEncoder in FLUX/Lumina terminology (same underlying role as vae)
  | 'clip_l'        // CLIP-L text encoder
  | 'clip_g'        // CLIP-G text encoder
  | 't5xxl'         // T5-XXL text encoder (FLUX, SD3; Anima uses T5 tokenizer only)
  | 'gemma2'        // Gemma2 text encoder (Lumina → --gemma2)
  | 'qwen3'         // Qwen3-0.6B text encoder (Anima → --qwen3)
  | 'qwen2_5_vl'    // Qwen2.5-VL text encoder (HunyuanImage → --text_encoder)
  | 'byt5'          // byT5 text encoder (HunyuanImage → --byt5)
  | 'llm_adapter'   // LLM Adapter Qwen3→T5 bridge (Anima → --llm_adapter_path, optional)
  | 'text_encoder'  // Generic TE fallback
  | 'unknown';

/** Coarse category — kept for backwards-compatible API filtering */
export type ModelType = 'checkpoint' | 'lora' | 'vae' | 'text_encoder' | 'unknown';

export interface ModelFile {
  /** Stable identifier — relative path from models root */
  id: string;
  name: string;
  filename: string;
  relativePath: string;
  absolutePath: string;
  extension: '.safetensors' | '.ckpt' | '.pt' | '.bin';
  sizeBytes: number;
  sizeMb: number;
  /**
   * Primary architecture for this file.
   * For files in shared/ directories, this is the FIRST architecture that claims the file.
   */
  arch: ModelArchitecture;
  /**
   * Architectures (other than `arch`) that also use this file.
   * Populated for files in shared/ directories (e.g., shared/ae/, shared/text_encoders/).
   * Empty array for architecture-specific files.
   */
  sharedWith: ModelArchitecture[];
  /**
   * Granular role — determines which CLI training argument this file is passed to.
   * Use this when building a training configuration.
   */
  role: ModelRole;
  /** Coarse category derived from role — use for simple dropdown filtering */
  type: ModelType;
  modifiedAt: Date;
}

export interface ModelsOptions {
    architectures?: ModelArchitecture[];
    types?: ModelType[];
    roles?: ModelRole[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const MODEL_EXTENSIONS = new Set(['.safetensors', '.ckpt', '.pt', '.bin']);