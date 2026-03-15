import type { ModelArchitecture, ModelRole, ModelType } from '../types/models.types';

// ─────────────────────────────────────────────────────────────────────────────
// Static enumerations — source of truth, no disk access needed
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_ARCHITECTURES: ModelArchitecture[] = [
  'sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan',
];

export const ALL_ROLES: ModelRole[] = [
  'checkpoint', 'dit', 'unet', 'lora', 'vae', 'ae',
  'clip_l', 'clip_g', 't5xxl', 'gemma2', 'qwen3', 'qwen2_5_vl',
  'byt5', 'llm_adapter', 'text_encoder',
];

export const ALL_TYPES: ModelType[] = ['checkpoint', 'lora', 'vae', 'text_encoder'];

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
  lumina:  'Lumina Image 2.0',
  hunyuan: 'HunyuanImage 2.1',
  unknown: 'Unknown',
};

export const ROLE_LABEL: Record<ModelRole, string> = {
  checkpoint:   'Checkpoint (all-in-one)',
  dit:          'Diffusion Transformer (DiT / MMDiT)',
  unet:         'U-Net',
  lora:         'LoRA / LyCORIS adapter',
  vae:          'VAE',
  ae:           'AutoEncoder (AE)',
  clip_l:       'CLIP-L text encoder',
  clip_g:       'CLIP-G text encoder',
  t5xxl:        'T5-XXL text encoder',
  gemma2:       'Gemma2 text encoder',
  qwen3:        'Qwen3-0.6B text encoder',
  qwen2_5_vl:   'Qwen2.5-VL text encoder',
  byt5:         'byT5 text encoder',
  llm_adapter:  'LLM Adapter (Qwen3→T5 bridge)',
  text_encoder: 'Text encoder (generic)',
  unknown:      'Unknown',
};

// ─────────────────────────────────────────────────────────────────────────────
// Roles that are valid for each architecture
// ─────────────────────────────────────────────────────────────────────────────

export const ARCH_ROLES: Record<ModelArchitecture, ModelRole[]> = {
  sd1:     ['checkpoint', 'unet', 'vae', 'lora', 'text_encoder'],
  sd2:     ['checkpoint', 'unet', 'vae', 'lora', 'text_encoder'],
  sdxl:    ['checkpoint', 'unet', 'vae', 'lora', 'clip_l', 'clip_g', 'text_encoder'],
  flux:    ['dit', 'ae', 'clip_l', 't5xxl', 'lora'],
  chroma:  ['dit', 'ae', 't5xxl', 'lora'],
  sd3:     ['dit', 'vae', 'clip_l', 'clip_g', 't5xxl', 'lora'],
  anima:   ['dit', 'vae', 'qwen3', 'llm_adapter', 'lora'],
  lumina:  ['dit', 'ae', 'gemma2', 'lora'],
  hunyuan: ['dit', 'vae', 'qwen2_5_vl', 'byt5', 'lora'],
  unknown: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Minimum required roles for an architecture to be "ready" for training.
// Outer array = OR (any variant satisfies readiness)
// Inner array = AND (all roles in a variant must be present)
// ─────────────────────────────────────────────────────────────────────────────

export const ARCH_REQUIRED_ROLES: Record<ModelArchitecture, ModelRole[][]> = {
  sd1:     [['checkpoint'], ['unet', 'vae', 'text_encoder']],
  sd2:     [['checkpoint'], ['unet', 'vae', 'text_encoder']],
  sdxl:    [['checkpoint'], ['unet', 'vae', 'clip_l', 'clip_g']],
  flux:    [['dit', 'ae', 'clip_l', 't5xxl']],
  // Chroma: no CLIP-L needed; ae and t5xxl resolved from shared/ dirs
  chroma:  [['dit', 'ae', 't5xxl']],
  sd3:     [['dit', 'vae', 'clip_l', 'clip_g', 't5xxl']],
  anima:   [['dit', 'vae', 'qwen3']],
  lumina:  [['dit', 'ae', 'gemma2']],
  hunyuan: [['dit', 'vae', 'qwen2_5_vl', 'byt5']],
  unknown: [[]],
};

// ─────────────────────────────────────────────────────────────────────────────
// Target subdirectory (relative to models root) for each arch × role combo.
//
// Used by:
//   - DownloaderService  → where to save a downloaded file
//   - ModelsService      → where to look when checking arch readiness
//   - SharedFileWarning  → which archs share a given directory
//
// ── Shared directories ────────────────────────────────────────────────────────
//
// Files that are physically identical across multiple architectures are stored
// once in a top-level `shared/` directory instead of being duplicated per-arch:
//
//   shared/ae/
//     └─ ae.safetensors          ← FLUX AE = Chroma AE = Lumina AE (same file)
//
//   shared/text_encoders/
//     ├─ clip_l.safetensors      ← FLUX + SD3 (not used by Chroma)
//     ├─ t5xxl_fp16.safetensors  ← FLUX + Chroma + SD3
//     └─ t5xxl_fp8_e4m3fn.safetensors
//
//   shared/vae/
//     └─ vae-ft-mse-*.safetensors ← SD1 + SD2 (identical file)
//
// All architectures that need these files point their ARCH_ROLE_DIR entries
// to the same shared/ path. ModelsService.filesForArchRole() will find them
// there correctly regardless of which arch is being checked.
//
// ── Chroma DiT directory ──────────────────────────────────────────────────────
//
// Chroma DiT checkpoints now live in chroma/ (not flux/) — they are different
// model weights even though both architectures use flux_train_network.py.
//
// ─────────────────────────────────────────────────────────────────────────────

export type ArchRoleDirMap = Partial<Record<ModelRole, string>>;

export const ARCH_ROLE_DIR: Record<ModelArchitecture, ArchRoleDirMap> = {
  sd1: {
    checkpoint:   'sd1',
    unet:         'sd1',
    vae:          'shared/vae',           // shared with SD2 — identical file
    lora:         'sd1/lora',
    text_encoder: 'sd1/text_encoders',
  },
  sd2: {
    checkpoint:   'sd2',
    unet:         'sd2',
    vae:          'shared/vae',           // shared with SD1 — identical file
    lora:         'sd2/lora',
    text_encoder: 'sd2/text_encoders',
  },
  sdxl: {
    checkpoint:   'sdxl',
    unet:         'sdxl',
    vae:          'sdxl/vae',
    lora:         'sdxl/lora',
    clip_l:       'sdxl/text_encoders',
    clip_g:       'sdxl/text_encoders',
    text_encoder: 'sdxl/text_encoders',
  },
  flux: {
    dit:    'flux',
    ae:     'shared/ae',                  // shared with Chroma + Lumina
    clip_l: 'shared/text_encoders',       // shared with SD3
    t5xxl:  'shared/text_encoders',       // shared with Chroma + SD3
    lora:   'flux/lora',
  },
  chroma: {
    // Chroma DiT lives in chroma/ — different weights than FLUX DiT
    dit:   'chroma',
    ae:    'shared/ae',                   // shared with FLUX + Lumina
    t5xxl: 'shared/text_encoders',        // shared with FLUX + SD3
    lora:  'chroma/lora',
  },
  sd3: {
    dit:    'sd3',
    vae:    'sd3/vae',
    clip_l: 'shared/text_encoders',       // shared with FLUX
    // CLIP-G is SD3-specific — NOT shared with other architectures
    clip_g: 'sd3/text_encoders',
    t5xxl:  'shared/text_encoders',       // shared with FLUX + Chroma
    lora:   'sd3/lora',
  },
  anima: {
    dit:         'anima',
    vae:         'anima/vae',
    qwen3:       'anima/text_encoders',
    llm_adapter: 'anima/text_encoders',
    lora:        'anima/lora',
  },
  lumina: {
    dit:    'lumina',
    ae:     'shared/ae',                  // shared with FLUX + Chroma
    gemma2: 'lumina/text_encoders',
    lora:   'lumina/lora',
  },
  hunyuan: {
    dit:        'hunyuan',
    vae:        'hunyuan/vae',
    qwen2_5_vl: 'hunyuan/text_encoders',
    byt5:       'hunyuan/text_encoders',
    lora:       'hunyuan/lora',
  },
  unknown: {},
};