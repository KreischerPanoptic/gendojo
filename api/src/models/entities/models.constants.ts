import type { ModelArchitecture, ModelRole, ModelType } from './models.types';

// ─────────────────────────────────────────────────────────────────────────────
// Static enumerations — source of truth, no disk access needed
// ─────────────────────────────────────────────────────────────────────────────

/** All supported architectures (excludes 'unknown'). */
export const ALL_ARCHITECTURES: ModelArchitecture[] = [
  'sd1',
  'sd2',
  'sdxl',
  'flux',
  'chroma',
  'sd3',
  'anima',
  'lumina',
  'hunyuan',
];

/** All supported roles (excludes 'unknown'). */
export const ALL_ROLES: ModelRole[] = [
  'checkpoint',
  'dit',
  'unet',
  'lora',
  'vae',
  'ae',
  'clip_l',
  'clip_g',
  't5xxl',
  'gemma2',
  'qwen3',
  'qwen2_5_vl',
  'byt5',
  'llm_adapter',
  'text_encoder',
];

/** All supported coarse types (excludes 'unknown'). */
export const ALL_TYPES: ModelType[] = [
  'checkpoint',
  'lora',
  'vae',
  'text_encoder',
];

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable labels for UI dropdowns
// ─────────────────────────────────────────────────────────────────────────────

export const ARCH_LABEL: Record<ModelArchitecture, string> = {
  sd1:     'Stable Diffusion 1.x',
  sd2:     'Stable Diffusion 2.x',
  sdxl:    'Stable Diffusion XL',
  flux:    'FLUX.1',
  chroma:  'Chroma (FLUX variant)',
  sd3:     'Stable Diffusion 3 / 3.5',
  anima:   'Anima',
  lumina:  'Lumina Next-DiT',
  hunyuan: 'HunyuanImage',
  unknown: 'Unknown',
};

export const ROLE_LABEL: Record<ModelRole, string> = {
  checkpoint:  'Checkpoint (all-in-one)',
  dit:         'Diffusion Transformer (DiT / MMDiT)',
  unet:        'U-Net',
  lora:        'LoRA / LyCORIS adapter',
  vae:         'VAE',
  ae:          'AutoEncoder (AE)',
  clip_l:      'CLIP-L text encoder',
  clip_g:      'CLIP-G text encoder',
  t5xxl:       'T5-XXL text encoder',
  gemma2:      'Gemma2 text encoder',
  qwen3:       'Qwen3-0.6B text encoder',
  qwen2_5_vl:  'Qwen2.5-VL text encoder',
  byt5:        'byT5 text encoder',
  llm_adapter: 'LLM Adapter (Qwen3→T5 bridge)',
  text_encoder:'Text encoder (generic)',
  unknown:     'Unknown',
};

// ─────────────────────────────────────────────────────────────────────────────
// Roles that are valid for each architecture
// Used by the downloader to validate user intent before fetching.
// ─────────────────────────────────────────────────────────────────────────────

export const ARCH_ROLES: Record<ModelArchitecture, ModelRole[]> = {
  sd1:     ['checkpoint', 'unet', 'vae', 'lora', 'text_encoder'],
  sd2:     ['checkpoint', 'unet', 'vae', 'lora', 'text_encoder'],
  sdxl:    ['checkpoint', 'unet', 'vae', 'lora', 'clip_l', 'clip_g', 'text_encoder'],
  flux:    ['dit', 'ae', 'clip_l', 't5xxl', 'lora'],
  chroma:  ['dit', 'ae', 't5xxl', 'lora'],          // no CLIP-L, guidance=0
  sd3:     ['dit', 'vae', 'clip_l', 'clip_g', 't5xxl', 'lora'],
  anima:   ['dit', 'vae', 'qwen3', 'llm_adapter', 'lora'],
  lumina:  ['dit', 'ae', 'gemma2', 'lora'],
  hunyuan: ['dit', 'vae', 'qwen2_5_vl', 'byt5', 'lora'],
  unknown: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Target subdirectory (relative to models root) for each arch × role combo.
//
// Used by the downloader to decide where to save a file.
// All paths are relative to PathsConfig.models (e.g. /workspace/models).
//
// Convention:
//   <arch>/              — main weights (dit, checkpoint, unet, ae)
//   <arch>/vae/          — VAE / AE weights (some archs call it ae but same dir)
//   <arch>/text_encoders/— shared TE directory per arch
//   <arch>/lora/         — LoRA adapters
//   shared/              — files genuinely reusable across architectures
//                          (e.g. a CLIP-L shared between FLUX and SD3)
// ─────────────────────────────────────────────────────────────────────────────

export type ArchRoleDirMap = Partial<Record<ModelRole, string>>;

export const ARCH_ROLE_DIR: Record<ModelArchitecture, ArchRoleDirMap> = {
  sd1: {
    checkpoint:  'sd1',
    unet:        'sd1',
    vae:         'sd1/vae',
    lora:        'sd1/lora',
    text_encoder:'sd1/text_encoders',
  },
  sd2: {
    checkpoint:  'sd2',
    unet:        'sd2',
    vae:         'sd2/vae',
    lora:        'sd2/lora',
    text_encoder:'sd2/text_encoders',
  },
  sdxl: {
    checkpoint:  'sdxl',
    unet:        'sdxl',
    vae:         'sdxl/vae',
    lora:        'sdxl/lora',
    clip_l:      'sdxl/text_encoders',
    clip_g:      'sdxl/text_encoders',
    text_encoder:'sdxl/text_encoders',
  },
  flux: {
    dit:   'flux',
    ae:    'flux/ae',
    clip_l:'flux/text_encoders',
    t5xxl: 'flux/text_encoders',
    lora:  'flux/lora',
  },
  chroma: {
    // Chroma is a FLUX variant — lives in the same root dir
    dit:   'flux',
    ae:    'flux/ae',
    t5xxl: 'flux/text_encoders',
    lora:  'flux/lora',
  },
  sd3: {
    dit:   'sd3',
    vae:   'sd3/vae',
    clip_l:'sd3/text_encoders',
    clip_g:'sd3/text_encoders',
    t5xxl: 'sd3/text_encoders',
    lora:  'sd3/lora',
  },
  anima: {
    dit:        'anima',
    vae:        'anima/vae',
    qwen3:      'anima/text_encoders',
    llm_adapter:'anima/text_encoders',
    lora:       'anima/lora',
  },
  lumina: {
    dit:   'lumina',
    ae:    'lumina/ae',
    gemma2:'lumina/text_encoders',
    lora:  'lumina/lora',
  },
  hunyuan: {
    dit:       'hunyuan',
    vae:       'hunyuan/vae',
    qwen2_5_vl:'hunyuan/text_encoders',
    byt5:      'hunyuan/text_encoders',
    lora:      'hunyuan/lora',
  },
  unknown: {},
};