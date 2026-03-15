// ─────────────────────────────────────────────────────────────────────────────
// Types from generated OpenAPI schema
// ─────────────────────────────────────────────────────────────────────────────

import type { FileIntegrityResultDto, ModelFileDto, ModelsControllerListData } from '@api/types.gen'

export type {
  ModelFileDto,
  RefreshResponseDto,
  DeleteModelResultDto,
  DeleteArchPreviewDto,
  DeleteArchResultDto,
  FileIntegrityResultDto,
  ArchReadinessResultDto
} from '@api/types.gen'

export type ModelsListParams = ModelsControllerListData['query']
export type ModelArchitecture = ModelFileDto['arch']
export type ModelRole = ModelFileDto['role']
export type ModelType = ModelFileDto['type']

// ─────────────────────────────────────────────────────────────────────────────
// Integrity types
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrityStatus = FileIntegrityResultDto['status']

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export const ARCH_LABEL: Record<ModelArchitecture, string> = {
  sd1:     'SD 1.x',
  sd2:     'SD 2.x',
  sdxl:    'SDXL',
  flux:    'FLUX.1',
  chroma:  'Chroma',
  sd3:     'SD 3 / 3.5',
  anima:   'Anima',
  lumina:  'Lumina',
  hunyuan: 'HunyuanImage',
  unknown: 'Unknown',
}

export const ROLE_LABEL: Record<ModelRole, string> = {
  checkpoint:  'Checkpoint',
  dit:         'DiT / MMDiT',
  unet:        'U-Net',
  lora:        'LoRA',
  vae:         'VAE',
  ae:          'AutoEncoder',
  clip_l:      'CLIP-L',
  clip_g:      'CLIP-G',
  t5xxl:       'T5-XXL',
  gemma2:      'Gemma2',
  qwen3:       'Qwen3-0.6B',
  qwen2_5_vl:  'Qwen2.5-VL',
  byt5:        'byT5',
  llm_adapter: 'LLM Adapter',
  text_encoder:'Text Encoder',
  unknown:     'Unknown',
}

export const ARCH_COLOR: Record<ModelArchitecture, string> = {
  sd1:     'gray',
  sd2:     'gray',
  sdxl:    'violet',
  flux:    'blue',
  chroma:  'cyan',
  sd3:     'teal',
  anima:   'orange',
  lumina:  'yellow',
  hunyuan: 'red',
  unknown: 'dark',
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const GiB = 1024 ** 3
  const MiB = 1024 ** 2
  if (bytes >= GiB) return `${(bytes / GiB).toFixed(2)} GB`
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}