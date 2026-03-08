import type { ModelPreset } from '../entities/downloader.types';

/**
 * Built-in presets for common base models used with kohya-ss/sd-scripts.
 *
 * HuggingFace download URL pattern:
 *   https://huggingface.co/{hfRepoId}/resolve/main/{hfFilename}
 *
 * Models marked requiresHfToken:true are gated — the user must have accepted
 * the license on HuggingFace and set HF_TOKEN in the environment.
 */
export const MODEL_PRESETS: ModelPreset[] = [
  // ── FLUX.1 ────────────────────────────────────────────────────────────────

  {
    id: 'flux-dev-dit',
    name: 'FLUX.1-dev (DiT)',
    arch: 'flux',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'black-forest-labs/FLUX.1-dev',
    hfFilename: 'flux1-dev.safetensors',
    filename: 'flux1-dev.safetensors',
    sizeMb: 23_800,
    requiresHfToken: true,
    description: 'FLUX.1-dev base model. Requires HF token — accept license at huggingface.co/black-forest-labs/FLUX.1-dev',
  },
  {
    id: 'flux-schnell-dit',
    name: 'FLUX.1-schnell (DiT)',
    arch: 'flux',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'black-forest-labs/FLUX.1-schnell',
    hfFilename: 'flux1-schnell.safetensors',
    filename: 'flux1-schnell.safetensors',
    sizeMb: 23_800,
    requiresHfToken: true,
    description: 'FLUX.1-schnell base model. Distilled, faster inference.',
  },
  {
    id: 'flux-ae',
    name: 'FLUX.1 AE (AutoEncoder)',
    arch: 'flux',
    role: 'ae',
    source: 'huggingface',
    hfRepoId: 'black-forest-labs/FLUX.1-dev',
    hfFilename: 'ae.safetensors',
    filename: 'ae.safetensors',
    sizeMb: 335,
    requiresHfToken: true,
    description: 'FLUX autoencoder. Shared between FLUX.1-dev and FLUX.1-schnell.',
  },
  {
    id: 'flux-clip-l',
    name: 'CLIP-L (FLUX / SD3 shared)',
    arch: 'flux',
    role: 'clip_l',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 'clip_l.safetensors',
    filename: 'clip_l.safetensors',
    sizeMb: 246,
    requiresHfToken: false,
    description: 'CLIP-L text encoder. Shared by FLUX.1 and SD3/SD3.5.',
  },
  {
    id: 'flux-t5xxl-fp16',
    name: 'T5-XXL fp16 (FLUX / SD3 shared)',
    arch: 'flux',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description: 'T5-XXL text encoder in fp16. Full quality, ~9.8 GB.',
  },
  {
    id: 'flux-t5xxl-fp8',
    name: 'T5-XXL fp8 (FLUX / SD3 shared, quantized)',
    arch: 'flux',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description: 'T5-XXL text encoder in fp8 (e4m3fn). ~4.9 GB, recommended for VRAM-constrained setups.',
  },

  // ── Chroma (FLUX variant) ─────────────────────────────────────────────────

  {
    id: 'chroma-dit',
    name: 'Chroma (DiT)',
    arch: 'chroma',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'lodestones/Chroma',
    hfFilename: 'chroma-unlocked.safetensors',
    filename: 'chroma-unlocked.safetensors',
    sizeMb: 23_800,
    requiresHfToken: false,
    description: 'Chroma — FLUX.1 variant trained without CFG (guidance_scale=0). No CLIP-L needed.',
  },

  // ── SDXL ─────────────────────────────────────────────────────────────────

  {
    id: 'sdxl-base-checkpoint',
    name: 'SDXL Base 1.0 (checkpoint)',
    arch: 'sdxl',
    role: 'checkpoint',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-xl-base-1.0',
    hfFilename: 'sd_xl_base_1.0.safetensors',
    filename: 'sd_xl_base_1.0.safetensors',
    sizeMb: 6_940,
    requiresHfToken: false,
    description: 'Stable Diffusion XL Base 1.0.',
  },
  {
    id: 'sdxl-vae-fp16-fix',
    name: 'SDXL VAE fp16-fix',
    arch: 'sdxl',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'madebyollin/sdxl-vae-fp16-fix',
    hfFilename: 'sdxl.vae.safetensors',
    filename: 'sdxl_vae_fp16_fix.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description: 'SDXL VAE with fp16 NaN fix. Recommended over the stock VAE for training.',
  },

  // ── SD 1.x ────────────────────────────────────────────────────────────────

  {
    id: 'sd15-checkpoint',
    name: 'Stable Diffusion 1.5 (checkpoint)',
    arch: 'sd1',
    role: 'checkpoint',
    source: 'huggingface',
    hfRepoId: 'stable-diffusion-v1-5/stable-diffusion-v1-5',
    hfFilename: 'v1-5-pruned-emaonly.safetensors',
    filename: 'v1-5-pruned-emaonly.safetensors',
    sizeMb: 3_970,
    requiresHfToken: false,
    description: 'Stable Diffusion 1.5, EMA-only pruned variant. Standard base for SD1 LoRA training.',
  },

  // ── SD 2.x ────────────────────────────────────────────────────────────────

  {
    id: 'sd21-checkpoint',
    name: 'Stable Diffusion 2.1 (checkpoint)',
    arch: 'sd2',
    role: 'checkpoint',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-2-1',
    hfFilename: 'v2-1_768-ema-pruned.safetensors',
    filename: 'v2-1_768-ema-pruned.safetensors',
    sizeMb: 5_200,
    requiresHfToken: false,
    description: 'Stable Diffusion 2.1, 768px, EMA pruned.',
  },

  // ── SD 3 / 3.5 ───────────────────────────────────────────────────────────

  {
    id: 'sd35-large-dit',
    name: 'SD 3.5 Large (DiT)',
    arch: 'sd3',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3.5-large',
    hfFilename: 'sd3.5_large.safetensors',
    filename: 'sd3.5_large.safetensors',
    sizeMb: 15_800,
    requiresHfToken: true,
    description: 'Stable Diffusion 3.5 Large. Requires HF token — accept license at huggingface.co/stabilityai/stable-diffusion-3.5-large',
  },
  {
    id: 'sd35-medium-dit',
    name: 'SD 3.5 Medium (DiT)',
    arch: 'sd3',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3.5-medium',
    hfFilename: 'sd3.5_medium.safetensors',
    filename: 'sd3.5_medium.safetensors',
    sizeMb: 5_900,
    requiresHfToken: true,
    description: 'Stable Diffusion 3.5 Medium. Good balance of quality and VRAM.',
  },

  // ── Lumina Image 2.0 ─────────────────────────────────────────────────────

  {
    id: 'lumina2-dit',
    name: 'Lumina Image 2.0 (DiT)',
    arch: 'lumina',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'Alpha-VLLM/Lumina-Image-2.0',
    hfFilename: 'model.safetensors',
    filename: 'lumina_image_2.0.safetensors',
    sizeMb: 12_500,
    requiresHfToken: false,
    description: 'Lumina Image 2.0 — Next-DiT architecture with Gemma2 text encoder.',
  },

  // ── HunyuanImage ─────────────────────────────────────────────────────────

  {
    id: 'hunyuan-dit',
    name: 'HunyuanImage 2.1 (DiT)',
    arch: 'hunyuan',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'tencent/HunyuanDiT',
    hfFilename: 'HunyuanDiT/t2i/model/pytorch_model_module.pt',
    filename: 'hunyuan_image_2.1.pt',
    sizeMb: 11_000,
    requiresHfToken: false,
    description: 'HunyuanImage 2.1 DiT weights.',
  },

  // ── Anima ────────────────────────────────────────────────────────────────

  {
    id: 'anima-dit',
    name: 'Anima (DiT)',
    arch: 'anima',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'circlestone-labs/Anima',
    hfFilename: 'split_files/diffusion_models/anima-preview.safetensors',
    filename: 'dit/anima-preview.safetensors',
    sizeMb: 4180,
    requiresHfToken: false,
    description: 'Anima DiT weights.',
  },
  {
    id: 'qwen-image-vae',
    name: 'Qwen-Image VAE',
    arch: 'anima',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'circlestone-labs/Anima',
    hfFilename: 'split_files/vae/qwen_image_vae.safetensors',
    filename: 'qwen_image_vae.safetensors',
    sizeMb: 254,
    requiresHfToken: false,
    description: 'Qwen Image VAE for Anima.',
  },
  {
    id: 'qwen-3-06b-base',
    name: 'Qwen3-06b Base',
    arch: 'anima',
    role: 'text_encoder',
    source: 'huggingface',
    hfRepoId: 'circlestone-labs/Anima',
    hfFilename: 'split_files/text_encoders/qwen_3_06b_base.safetensors',
    filename: 'text_encoders/qwen3-06b-base/qwen_3_06b_base.safetensors',
    sizeMb: 1190,
    requiresHfToken: false,
    description: 'Qwen3-06b Base LLM for Anima used as text encoder.',
  },
];

/** Group presets by architecture for the /downloader/presets endpoint */
export function getPresetsByArch(
  arch?: string,
): ModelPreset[] | Record<string, ModelPreset[]> {
  if (arch) {
    return MODEL_PRESETS.filter(p => p.arch === arch);
  }

  return MODEL_PRESETS.reduce<Record<string, ModelPreset[]>>((acc, preset) => {
    (acc[preset.arch] ??= []).push(preset);
    return acc;
  }, {});
}

/** Look up a single preset by id */
export function findPreset(id: string): ModelPreset | undefined {
  return MODEL_PRESETS.find(p => p.id === id);
}