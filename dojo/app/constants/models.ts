import type { ModelRole } from '#types/models'

export const ROLE_LABEL: Record<ModelRole, string> = {
  checkpoint: 'Checkpoint (all-in-one)',
  dit: 'Diffusion Transformer (DiT / MMDiT)',
  unet: 'U-Net',
  lora: 'LoRA / LyCORIS adapter',
  vae: 'VAE',
  ae: 'AutoEncoder (AE)',
  clip_l: 'CLIP-L text encoder',
  clip_g: 'CLIP-G text encoder',
  clip_h: 'CLIP-H text encoder',
  t5xxl: 'T5-XXL text encoder',
  gemma2: 'Gemma2 text encoder',
  qwen3: 'Qwen3-0.6B text encoder',
  qwen2_5_vl: 'Qwen2.5-VL text encoder',
  byt5: 'byT5 text encoder',
  llm_adapter: 'LLM Adapter (Qwen3→T5 bridge)',
  text_encoder: 'Text encoder (generic)',
  unknown: 'Unknown component',
}

export interface ModelVariant {
  required: ModelRole[]
  optional: ModelRole[]
}

export interface ArchitectureDefinition {
  label: string
  variants: ModelVariant[]
  directories: Partial<Record<ModelRole, string>>
}
