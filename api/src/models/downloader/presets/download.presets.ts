import type { ModelPreset } from '../entities/downloader.types';

/**
 * Built-in presets for common base models used with kohya-ss/sd-scripts.
 *
 * HuggingFace download URL pattern:
 *   https://huggingface.co/{hfRepoId}/resolve/main/{hfFilename}
 *
 * Models marked requiresHfToken:true are gated — the user must have accepted
 * the license on HuggingFace and set HF_TOKEN in the environment.
 *
 * Shared components across architectures:
 *   CLIP-L / T5-XXL  — comfyanonymous/flux_text_encoders (no token, used by FLUX + SD3 + Chroma)
 *   ae.safetensors   — FLUX AE == Lumina AE (same file, different download destinations)
 *
 * ARCH_ROLE_DIR in models.constants.ts maps Chroma's ae/t5xxl to flux/ subdirs,
 * so Chroma-tagged AE/T5 presets physically save alongside FLUX files — correct by design.
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
    description: 'FLUX.1-dev base DiT. Gated — accept license at huggingface.co/black-forest-labs/FLUX.1-dev and set HF_TOKEN.',
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
    description: 'FLUX.1-schnell base DiT. Distilled, faster inference. Gated — set HF_TOKEN.',
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
    description: 'FLUX AutoEncoder. Shared by FLUX.1-dev and FLUX.1-schnell. Gated — set HF_TOKEN.',
  },
  {
    id: 'flux-clip-l',
    name: 'CLIP-L (FLUX / SD3 / Chroma shared)',
    arch: 'flux',
    role: 'clip_l',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 'clip_l.safetensors',
    filename: 'clip_l.safetensors',
    sizeMb: 246,
    requiresHfToken: false,
    description: 'CLIP-L text encoder. No token required. Shared by FLUX.1 and SD3/SD3.5 (Chroma does not use CLIP-L).',
  },
  {
    id: 'flux-t5xxl-fp16',
    name: 'T5-XXL fp16 (FLUX / SD3 / Chroma shared)',
    arch: 'flux',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description: 'T5-XXL fp16. No token required. Shared by FLUX.1, Chroma, and SD3/SD3.5. Full quality, ~9.8 GB.',
  },
  {
    id: 'flux-t5xxl-fp8',
    name: 'T5-XXL fp8 (FLUX / SD3 / Chroma shared, quantized)',
    arch: 'flux',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description: 'T5-XXL fp8 (e4m3fn). No token required. Shared by FLUX.1, Chroma, and SD3/SD3.5. ~4.9 GB, recommended for <12 GB VRAM.',
  },

  // ── Chroma (FLUX variant — CLIP-L not needed, AE and T5-XXL same as FLUX) ─

  {
    id: 'chroma-dit',
    name: 'Chroma (DiT)',
    arch: 'chroma',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'lodestones/Chroma',
    hfFilename: 'chroma-unlocked-v50.safetensors',
    filename: 'chroma-unlocked-v50.safetensors',
    sizeMb: 23_800,
    requiresHfToken: false,
    description: 'Chroma — FLUX.1 variant trained without CFG (guidance_scale=0). No CLIP-L. Requires AE + T5-XXL (use chroma-ae / chroma-t5xxl presets below).',
  },
  {
    id: 'chroma-base-dit',
    name: 'Chroma Base (DiT)',
    arch: 'chroma',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'lodestones/Chroma1-Base',
    hfFilename: 'Chroma1-Base.safetensors',
    filename: 'Chroma1-Base.safetensors',
    sizeMb: 23_800,
    requiresHfToken: false,
    description: 'Chroma 1 Base model — official base checkpoint from lodestones/Chroma1-Base.',
  },
  {
    id: 'chroma-hd-dit',
    name: 'Chroma HD (DiT)',
    arch: 'chroma',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'lodestones/Chroma1-HD',
    hfFilename: 'Chroma1-HD.safetensors',
    filename: 'Chroma1-HD.safetensors',
    sizeMb: 23_800,
    requiresHfToken: false,
    description: 'Chroma 1 HD model — official HD checkpoint from lodestones/Chroma1-HD.',
  },
  {
    id: 'chroma-flash-dit',
    name: 'Chroma HD Flash (DiT)',
    arch: 'chroma',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'lodestones/Chroma1-Flash',
    hfFilename: 'Chroma1-HD-Flash.safetensors',
    filename: 'Chroma1-HD-Flash.safetensors',
    sizeMb: 23_800,
    requiresHfToken: false,
    description: 'Chroma 1 HD Flash model — official flash checkpoint from lodestones/Chroma1-Flash.',
  },
  {
    id: 'chroma-ae',
    name: 'Chroma AE (same as FLUX AE)',
    arch: 'chroma',
    role: 'ae',
    source: 'huggingface',
    hfRepoId: 'black-forest-labs/FLUX.1-dev',
    hfFilename: 'ae.safetensors',
    filename: 'ae.safetensors',
    sizeMb: 335,
    requiresHfToken: true,
    description: 'AutoEncoder for Chroma — physically identical to FLUX AE. Saved to flux/ae/ (shared dir). Gated — set HF_TOKEN.',
  },
  {
    id: 'chroma-t5xxl-fp16',
    name: 'T5-XXL fp16 (Chroma)',
    arch: 'chroma',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description: 'T5-XXL fp16 for Chroma. Same file as FLUX T5-XXL — saved to flux/text_encoders/ (shared dir).',
  },
  {
    id: 'chroma-t5xxl-fp8',
    name: 'T5-XXL fp8 (Chroma, quantized)',
    arch: 'chroma',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description: 'T5-XXL fp8 for Chroma. Saved to flux/text_encoders/ (shared dir). Recommended for <12 GB VRAM.',
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
    description: 'Stable Diffusion XL Base 1.0 (all-in-one checkpoint, includes CLIP-L, CLIP-G, VAE, U-Net).',
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
    description: 'SDXL VAE with fp16 NaN fix by madebyollin. Strongly recommended over stock VAE for training.',
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
    description: 'Stable Diffusion 1.5, EMA-only pruned. Standard base for SD1 LoRA training.',
  },
  {
    id: 'sd1-vae-ft-mse',
    name: 'SD 1.x VAE ft-MSE',
    arch: 'sd1',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'stabilityai/sd-vae-ft-mse-original',
    hfFilename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    filename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description: 'Improved SD 1.x VAE (fine-tuned with MSE loss). Better color and detail rendering than the stock 1.5 VAE.',
  },

  // ── SD 2.x ────────────────────────────────────────────────────────────────

  {
    id: 'sd21-checkpoint',
    name: 'Stable Diffusion 2.1 (checkpoint)',
    arch: 'sd2',
    role: 'checkpoint',
    source: 'huggingface',
    hfRepoId: 'sd2-community/stable-diffusion-2-1',
    hfFilename: 'v2-1_768-ema-pruned.safetensors',
    filename: 'v2-1_768-ema-pruned.safetensors',
    sizeMb: 5_200,
    requiresHfToken: false,
    description: 'Stable Diffusion 2.1, 768px, EMA pruned.',
  },
  {
    id: 'sd2-vae-ft-mse',
    name: 'SD 2.x VAE ft-MSE',
    arch: 'sd2',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'stabilityai/sd-vae-ft-mse-original',
    hfFilename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    filename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description: 'SD VAE fine-tuned with MSE loss. Compatible with both SD 1.x and SD 2.x.',
  },

  // ── SD 3 / 3.5 ───────────────────────────────────────────────────────────
  //
  // Both SD3.5 DiT presets are single-file format (.safetensors) — they embed
  // the VAE and text encoders internally. Pass just --pretrained_model_name_or_path
  // and sd3_train_network.py will detect components automatically.
  //
  // Use the separate encoder presets below only if you want to override
  // individual components (e.g. different T5-XXL precision) or train with
  // split files on low-VRAM setups.

  {
    id: 'sd35-large-dit',
    name: 'SD 3.5 Large (DiT, single-file)',
    arch: 'sd3',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3.5-large',
    hfFilename: 'sd3.5_large.safetensors',
    filename: 'sd3.5_large.safetensors',
    sizeMb: 15_800,
    requiresHfToken: true,
    description: 'SD 3.5 Large (single-file, includes VAE + all text encoders). Gated — accept license and set HF_TOKEN.',
  },
  {
    id: 'sd35-medium-dit',
    name: 'SD 3.5 Medium (DiT, single-file)',
    arch: 'sd3',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3.5-medium',
    hfFilename: 'sd3.5_medium.safetensors',
    filename: 'sd3.5_medium.safetensors',
    sizeMb: 5_900,
    requiresHfToken: true,
    description: 'SD 3.5 Medium (single-file, includes VAE + all text encoders). Good balance of quality and VRAM. Gated — set HF_TOKEN.',
  },
  {
    id: 'sd3-medium-dit',
    name: 'SD 3 Medium (DiT, single-file)',
    arch: 'sd3',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3-medium',
    hfFilename: 'sd3_medium.safetensors',
    filename: 'sd3_medium.safetensors',
    sizeMb: 4_340,
    requiresHfToken: true,
    description: 'SD 3 Medium (single-file, includes VAE + all text encoders). Good balance of quality and VRAM. Gated — set HF_TOKEN.',
  },

  // SD3 separate text encoders — for split-file setups or encoder reuse
  // CLIP-L and T5-XXL: same files as FLUX (comfyanonymous, no token)
  // CLIP-G: SD3-specific, from stabilityai SD3.5 repo (gated)

  {
    id: 'sd3-clip-l',
    name: 'CLIP-L (SD3 / FLUX shared)',
    arch: 'sd3',
    role: 'clip_l',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 'clip_l.safetensors',
    filename: 'clip_l.safetensors',
    sizeMb: 246,
    requiresHfToken: false,
    description: 'CLIP-L for SD3/SD3.5 split-file setup. Same file as FLUX CLIP-L — saved to sd3/text_encoders/.',
  },
  {
    id: 'sd3-clip-g',
    name: 'CLIP-G (SD3 / SD3.5)',
    arch: 'sd3',
    role: 'clip_g',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3.5-large',
    hfFilename: 'text_encoders/clip_g.safetensors',
    filename: 'clip_g.safetensors',
    sizeMb: 1_380,
    requiresHfToken: true,
    description: 'CLIP-G (OpenCLIP ViT-bigG) for SD3/SD3.5. Not used by FLUX. Gated — set HF_TOKEN.',
  },
  {
    id: 'sd3-t5xxl-fp16',
    name: 'T5-XXL fp16 (SD3)',
    arch: 'sd3',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description: 'T5-XXL fp16 for SD3/SD3.5 split-file setup. Same file as FLUX T5-XXL — saved to sd3/text_encoders/.',
  },
  {
    id: 'sd3-t5xxl-fp8',
    name: 'T5-XXL fp8 (SD3, quantized)',
    arch: 'sd3',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description: 'T5-XXL fp8 for SD3/SD3.5. Saved to sd3/text_encoders/. Recommended for <12 GB VRAM.',
  },

  // ── Lumina Image 2.0 ─────────────────────────────────────────────────────
  //
  // Uses Comfy-Org repack (split files, no gating, bf16 precision).
  // AE (ae.safetensors) is physically identical to FLUX AE but saved separately
  // to lumina/ae/ per ARCH_ROLE_DIR convention.

  {
    id: 'lumina2-dit',
    name: 'Lumina Image 2.0 (DiT, bf16)',
    arch: 'lumina',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/Lumina_Image_2.0_Repackaged',
    hfFilename: 'split_files/diffusion_models/lumina_2_model_bf16.safetensors',
    filename: 'lumina_2_model_bf16.safetensors',
    sizeMb: 4_200,
    requiresHfToken: false,
    description: 'Lumina Image 2.0 Next-DiT (bf16). Requires Gemma2 text encoder + AE (use lumina2-gemma2 / lumina2-ae presets).',
  },
  {
    id: 'lumina2-gemma2',
    name: 'Gemma2 2B fp16 (Lumina)',
    arch: 'lumina',
    role: 'gemma2',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/Lumina_Image_2.0_Repackaged',
    hfFilename: 'split_files/text_encoders/gemma_2_2b_fp16.safetensors',
    filename: 'gemma_2_2b_fp16.safetensors',
    sizeMb: 4_000,
    requiresHfToken: false,
    description: 'Gemma2 2B fp16 — sole text encoder for Lumina Image 2.0. Passed as --gemma2.',
  },
  {
    id: 'lumina2-ae',
    name: 'Lumina Image 2.0 AE',
    arch: 'lumina',
    role: 'ae',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/Lumina_Image_2.0_Repackaged',
    hfFilename: 'split_files/vae/ae.safetensors',
    filename: 'ae.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description: 'AutoEncoder for Lumina Image 2.0. Note: identical file to FLUX AE — saved to lumina/ae/ to keep architectures self-contained.',
  },

  // ── HunyuanImage 2.1 ─────────────────────────────────────────────────────
  //
  // All supporting models (text encoders + VAE) from Comfy-Org repack.
  // Text encoders: Qwen2.5-VL 7B (--text_encoder) + byT5-small (--byt5).
  // VAE: HunyuanImage-specific, NOT compatible with SDXL/SD3/FLUX.

  {
    id: 'hunyuan-dit',
    name: 'HunyuanImage 2.1 (DiT)',
    arch: 'hunyuan',
    role: 'dit',
    source: 'huggingface',
    hfRepoId: 'tencent/HunyuanImage-2.1',
    hfFilename: 'dit/hunyuanimage2.1.safetensors',
    filename: 'hunyuanimage2.1.safetensors',
    sizeMb: 11_000,
    requiresHfToken: false,
    description: 'HunyuanImage 2.1 DiT weights. Requires Qwen2.5-VL + byT5 text encoders + HunyuanImage VAE.',
  },
  {
    id: 'hunyuan-qwen2-5-vl',
    name: 'Qwen2.5-VL 7B (HunyuanImage text encoder)',
    arch: 'hunyuan',
    role: 'qwen2_5_vl',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/HunyuanImage_2.1_ComfyUI',
    hfFilename: 'split_files/text_encoders/qwen_2.5_vl_7b.safetensors',
    filename: 'qwen_2.5_vl_7b.safetensors',
    sizeMb: 15_000,
    requiresHfToken: false,
    description: 'Qwen2.5-VL 7B — primary text encoder for HunyuanImage 2.1. Passed as --text_encoder. ~15 GB.',
  },
  {
    id: 'hunyuan-byt5',
    name: 'byT5-small GlyphXL fp16 (HunyuanImage)',
    arch: 'hunyuan',
    role: 'byt5',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/HunyuanImage_2.1_ComfyUI',
    hfFilename: 'split_files/text_encoders/byt5_small_glyphxl_fp16.safetensors',
    filename: 'byt5_small_glyphxl_fp16.safetensors',
    sizeMb: 300,
    requiresHfToken: false,
    description: 'byT5-small (GlyphXL, fp16) — secondary text encoder for HunyuanImage 2.1. Passed as --byt5.',
  },
  {
    id: 'hunyuan-vae',
    name: 'HunyuanImage 2.1 VAE (fp16)',
    arch: 'hunyuan',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/HunyuanImage_2.1_ComfyUI',
    hfFilename: 'split_files/vae/hunyuan_image_2.1_vae_fp16.safetensors',
    filename: 'hunyuan_image_2.1_vae_fp16.safetensors',
    sizeMb: 500,
    requiresHfToken: false,
    description: 'HunyuanImage 2.1 VAE (fp16). NOT compatible with SDXL, SD3, or FLUX VAE/AE.',
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
    filename: 'anima-preview.safetensors',
    sizeMb: 4_180,
    requiresHfToken: false,
    description: 'Anima DiT base weights (preview). Requires Qwen-Image VAE + Qwen3-0.6B text encoder.',
  },
  {
    id: 'anima-qwen-image-vae',
    name: 'Qwen-Image VAE (Anima)',
    arch: 'anima',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'circlestone-labs/Anima',
    hfFilename: 'split_files/vae/qwen_image_vae.safetensors',
    filename: 'qwen_image_vae.safetensors',
    sizeMb: 254,
    requiresHfToken: false,
    description: 'Qwen-Image VAE for Anima. NOT compatible with SDXL or other architectures.',
  },
  {
    id: 'anima-qwen3-06b',
    name: 'Qwen3-0.6B Base (Anima text encoder)',
    arch: 'anima',
    role: 'qwen3',
    source: 'huggingface',
    hfRepoId: 'circlestone-labs/Anima',
    hfFilename: 'split_files/text_encoders/qwen_3_06b_base.safetensors',
    filename: 'qwen3-06b-base/qwen_3_06b_base.safetensors',
    sizeMb: 1_190,
    requiresHfToken: false,
    description: 'Qwen3-0.6B Base — text encoder for Anima. Passed as --qwen3.',
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