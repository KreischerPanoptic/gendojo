import type { ArchitectureDefinition } from '#constants/models'
import type { ModelArchitecture } from '#contracts/enums'

export const ARCHITECTURE_REGISTRY: Record<ModelArchitecture, ArchitectureDefinition> = {
  'sd1': {
    label: 'Stable Diffusion 1.x',
    variants: [
      { required: ['checkpoint'], optional: ['vae'] },
      { required: ['unet', 'vae', 'clip_l'], optional: [] },
    ],
    directories: {
      checkpoint: 'sd1/checkpoint',
      unet: 'sd1/unet',
      vae: 'shared/vae',
      clip_l: 'shared/text_encoders',
      text_encoder: 'sd1/text_encoders',
    },
  },
  'sd2': {
    label: 'Stable Diffusion 2.x',
    variants: [
      { required: ['checkpoint'], optional: ['vae'] },
      { required: ['unet', 'vae', 'clip_h'], optional: [] },
    ],
    directories: {
      checkpoint: 'sd2/checkpoint',
      unet: 'sd2/unet',
      vae: 'shared/vae',
      clip_h: 'sd2/text_encoders',
      text_encoder: 'sd2/text_encoders',
    },
  },
  'sdxl': {
    label: 'Stable Diffusion XL',
    variants: [
      { required: ['checkpoint'], optional: ['vae'] },
      { required: ['unet', 'vae', 'clip_l', 'clip_g'], optional: [] },
    ],
    directories: {
      checkpoint: 'sdxl/checkpoint',
      unet: 'sdxl/unet',
      vae: 'sdxl/vae',
      clip_l: 'shared/text_encoders',
      clip_g: 'shared/text_encoders',
      text_encoder: 'sdxl/text_encoders',
    },
  },
  'flux.1': {
    label: 'FLUX.1',
    variants: [{ required: ['dit', 'ae', 'clip_l', 't5xxl'], optional: [] }],
    directories: {
      dit: 'flux/dit',
      ae: 'shared/ae',
      clip_l: 'shared/text_encoders',
      t5xxl: 'shared/text_encoders',
    },
  },
  'chroma': {
    label: 'Chroma (FLUX variant)',
    variants: [{ required: ['dit', 'ae', 't5xxl'], optional: [] }],
    directories: {
      dit: 'chroma/dit',
      ae: 'shared/ae',
      t5xxl: 'shared/text_encoders',
    },
  },
  'sd3': {
    label: 'Stable Diffusion 3 / 3.5',
    variants: [{ required: ['dit', 'vae', 'clip_l', 'clip_g', 't5xxl'], optional: [] }],
    directories: {
      dit: 'sd3/dit',
      vae: 'sd3/vae',
      clip_l: 'shared/text_encoders',
      clip_g: 'shared/text_encoders',
      t5xxl: 'shared/text_encoders',
    },
  },
  'anima': {
    label: 'Anima',
    variants: [{ required: ['dit', 'vae', 'qwen3'], optional: ['llm_adapter'] }],
    directories: {
      dit: 'anima/dit',
      vae: 'anima/vae',
      qwen3: 'anima/text_encoders',
      llm_adapter: 'anima/text_encoders',
    },
  },
  'lumina-2.0': {
    label: 'Lumina Image 2.0',
    variants: [{ required: ['dit', 'ae', 'gemma2'], optional: [] }],
    directories: {
      dit: 'lumina/dit',
      ae: 'shared/ae',
      gemma2: 'lumina/text_encoders',
    },
  },
  'hunyuan-2.1': {
    label: 'HunyuanImage 2.1',
    variants: [{ required: ['dit', 'vae', 'qwen2_5_vl', 'byt5'], optional: [] }],
    directories: {
      dit: 'hunyuan/dit',
      vae: 'hunyuan/vae',
      qwen2_5_vl: 'hunyuan/text_encoders',
      byt5: 'hunyuan/text_encoders',
    },
  },
  // Handles your old 'unknown' fallback cleanly
  'unknown': {
    label: 'Unknown',
    variants: [],
    directories: {},
  },
}
