import type { ModelArchitecture, ModelIntegrityStatus } from '#contracts/enums'
import type { ModelRole } from '#types/models'

export const INTEGRITY_COLOR: Record<ModelIntegrityStatus, string> = {
  ok: 'teal',
  corrupted: 'red',
  unknown: 'gray',
}

export const INTEGRITY_LABEL: Record<ModelIntegrityStatus, string> = {
  ok: 'OK',
  corrupted: 'Corrupted',
  unknown: 'No hash',
}

export const ARCH_LABEL: Record<ModelArchitecture, string> = {
  'sd1': 'SD 1.x',
  'sd2': 'SD 2.x',
  'sdxl': 'SDXL',
  'flux.1': 'FLUX.1',
  'chroma': 'Chroma',
  'sd3': 'SD 3 / 3.5',
  'anima': 'Anima',
  'lumina-2.0': 'Lumina Image 2.0',
  'hunyuan-2.1': 'HunyuanImage 2.1',
  'unknown': 'Unknown',
}

export const ROLE_LABEL: Record<ModelRole, string> = {
  checkpoint: 'Checkpoint',
  dit: 'DiT / MMDiT',
  unet: 'U-Net',
  lora: 'LoRA',
  vae: 'VAE',
  ae: 'AutoEncoder',
  clip_l: 'CLIP-L',
  clip_g: 'CLIP-G',
  clip_h: 'CLIP-H',
  t5xxl: 'T5-XXL',
  gemma2: 'Gemma2',
  qwen3: 'Qwen3-0.6B',
  qwen2_5_vl: 'Qwen2.5-VL',
  byt5: 'byT5',
  llm_adapter: 'LLM Adapter',
  text_encoder: 'Text Encoder',
  unknown: 'Unknown',
}

export const ARCH_COLOR: Record<ModelArchitecture, string> = {
  'sd1': 'gray',
  'sd2': 'gray',
  'sdxl': 'violet',
  'flux.1': 'blue',
  'chroma': 'cyan',
  'sd3': 'teal',
  'anima': 'orange',
  'lumina-2.0': 'yellow',
  'hunyuan-2.1': 'red',
  'unknown': 'dark',
}
