import type { ModelPreset } from '../types/downloader.types';

/**
 * Built-in presets for common base models used with kohya-ss/sd-scripts.
 *
 * HuggingFace download URL pattern:
 *   https://huggingface.co/{hfRepoId}/resolve/main/{hfFilename}
 *
 * ── Shared files ─────────────────────────────────────────────────────────────
 *
 * Several files are physically identical across architectures. Presets for
 * these files carry a `sharedDestination` field. All presets with the same
 * `sharedDestination` save to the same path under `models/`:
 *
 *   shared/ae/ae.safetensors
 *     └─ FLUX.1 AE  ≡  Chroma AE  ≡  Lumina Image 2.0 AE  (same weights)
 *
 *   shared/text_encoders/clip_l.safetensors
 *     └─ FLUX CLIP-L  ≡  SD3/SD3.5 CLIP-L
 *
 *   shared/text_encoders/t5xxl_fp16.safetensors
 *     └─ FLUX T5-XXL fp16  ≡  Chroma T5-XXL fp16  ≡  SD3 T5-XXL fp16
 *
 *   shared/text_encoders/t5xxl_fp8_e4m3fn.safetensors
 *     └─ FLUX T5-XXL fp8  ≡  Chroma T5-XXL fp8  ≡  SD3 T5-XXL fp8
 *
 *   shared/vae/vae-ft-mse-840000-ema-pruned.safetensors
 *     └─ SD 1.x VAE ft-MSE  ≡  SD 2.x VAE ft-MSE  (same file, different repos)
 *
 * Arch-specific presets that map to a shared file still appear in the list so
 * the UI can show "you need this component for Chroma / SD3 / etc." — but the
 * DownloaderService will skip the download if the file already exists at the
 * shared destination, regardless of which preset triggered it.
 *
 * ── Directory layout ─────────────────────────────────────────────────────────
 *
 *   models/
 *   ├── shared/
 *   │   ├── ae/              ← FLUX / Chroma / Lumina AE
 *   │   └── text_encoders/   ← CLIP-L, T5-XXL (fp16 + fp8), shared by FLUX/Chroma/SD3
 *   ├── flux/
 *   │   └── dit/             ← FLUX.1-dev, FLUX.1-schnell DiT only
 *   ├── chroma/
 *   │   └── dit/             ← Chroma DiT checkpoints
 *   ├── sdxl/                ← SDXL checkpoint + VAE
 *   ├── sd1/                 ← SD 1.x checkpoint
 *   ├── sd2/                 ← SD 2.x checkpoint
 *   ├── sd3/
 *   │   ├── dit/             ← SD3/SD3.5 single-file checkpoints
 *   │   ├── text_encoders/   ← CLIP-G (SD3-specific, NOT shared)
 *   │   └── vae/             ← SD3 VAE if split
 *   ├── lumina/
 *   │   ├── dit/             ← Lumina DiT
 *   │   └── text_encoders/   ← Gemma2
 *   ├── hunyuan/             ← HunyuanImage 2.1 DiT, Qwen2.5-VL, byT5, VAE
 *   └── anima/               ← Anima DiT, Qwen-Image VAE, Qwen3 text encoder
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
    name: 'FLUX / Chroma / Lumina AE (shared)',
    arch: 'flux',
    role: 'ae',
    source: 'huggingface',
    hfRepoId: 'black-forest-labs/FLUX.1-dev',
    hfFilename: 'ae.safetensors',
    filename: 'ae.safetensors',
    sharedDestination: 'shared/ae/ae.safetensors',
    sizeMb: 335,
    requiresHfToken: true,
    description:
      'FLUX AutoEncoder. Physically identical to the Chroma AE and Lumina 2.0 AE — ' +
      'saved once to models/shared/ae/. Gated — set HF_TOKEN.',
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
    sharedDestination: 'shared/text_encoders/clip_l.safetensors',
    sizeMb: 246,
    requiresHfToken: false,
    description:
      'CLIP-L text encoder. Shared by FLUX.1 and SD3/SD3.5 — saved once to ' +
      'models/shared/text_encoders/. No token required. Chroma does not use CLIP-L.',
  },
  {
    id: 'flux-t5xxl-fp16',
    name: 'T5-XXL fp16 (FLUX / Chroma / SD3 shared)',
    arch: 'flux',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sharedDestination: 'shared/text_encoders/t5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description:
      'T5-XXL fp16. Shared by FLUX.1, Chroma, and SD3/SD3.5 — saved once to ' +
      'models/shared/text_encoders/. No token required. ~9.8 GB.',
  },
  {
    id: 'flux-t5xxl-fp8',
    name: 'T5-XXL fp8 (FLUX / Chroma / SD3 shared, quantized)',
    arch: 'flux',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sharedDestination: 'shared/text_encoders/t5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description:
      'T5-XXL fp8 (e4m3fn). Shared by FLUX.1, Chroma, and SD3/SD3.5 — saved once to ' +
      'models/shared/text_encoders/. ~4.9 GB, recommended for <12 GB VRAM.',
  },

  // ── Chroma ────────────────────────────────────────────────────────────────
  //
  // DiT checkpoints go to models/chroma/dit/ (own arch directory).
  // AE and T5-XXL are identical to FLUX equivalents → sharedDestination.
  // Chroma does NOT use CLIP-L.

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
    description:
      'Chroma — FLUX.1 variant trained without CFG (guidance_scale=0). Does not use CLIP-L. ' +
      'Requires AE (flux-ae) + T5-XXL (flux-t5xxl-fp16 or flux-t5xxl-fp8) from shared presets.',
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
    description: 'Chroma 1 Base checkpoint (lodestones/Chroma1-Base).',
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
    description: 'Chroma 1 HD checkpoint (lodestones/Chroma1-HD).',
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
    description: 'Chroma 1 HD Flash checkpoint (lodestones/Chroma1-Flash).',
  },
  // AE and T5-XXL for Chroma are arch-tagged presets that resolve to the same
  // shared destination as the FLUX equivalents. Downloading either the FLUX
  // preset or the Chroma preset results in the same file at the same path.
  {
    id: 'chroma-ae',
    name: 'Chroma AE (shared with FLUX / Lumina)',
    arch: 'chroma',
    role: 'ae',
    source: 'huggingface',
    hfRepoId: 'black-forest-labs/FLUX.1-dev',
    hfFilename: 'ae.safetensors',
    filename: 'ae.safetensors',
    sharedDestination: 'shared/ae/ae.safetensors',
    sizeMb: 335,
    requiresHfToken: true,
    description:
      'AutoEncoder for Chroma. Identical to FLUX AE — resolves to models/shared/ae/ae.safetensors. ' +
      'Downloading flux-ae or chroma-ae saves the same file. Gated — set HF_TOKEN.',
  },
  {
    id: 'chroma-t5xxl-fp16',
    name: 'T5-XXL fp16 (Chroma, shared with FLUX / SD3)',
    arch: 'chroma',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sharedDestination: 'shared/text_encoders/t5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description:
      'T5-XXL fp16 for Chroma. Identical to flux-t5xxl-fp16 — resolves to models/shared/text_encoders/. ' +
      'Only downloaded once regardless of which arch-tagged preset triggers it.',
  },
  {
    id: 'chroma-t5xxl-fp8',
    name: 'T5-XXL fp8 (Chroma, shared, quantized)',
    arch: 'chroma',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sharedDestination: 'shared/text_encoders/t5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description:
      'T5-XXL fp8 for Chroma. Identical to flux-t5xxl-fp8 — resolves to models/shared/text_encoders/. ' +
      'Recommended for <12 GB VRAM.',
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
    name: 'SD VAE ft-MSE (SD 1.x / 2.x shared)',
    arch: 'sd1',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'stabilityai/sd-vae-ft-mse-original',
    hfFilename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    filename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    sharedDestination: 'shared/vae/vae-ft-mse-840000-ema-pruned.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description:
      'Improved SD VAE (fine-tuned with MSE loss). Compatible with both SD 1.x and SD 2.x — ' +
      'saved once to models/shared/vae/. The sd2-vae-ft-mse preset resolves to the same file.',
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
    name: 'SD VAE ft-MSE (SD 2.x / 1.x shared)',
    arch: 'sd2',
    role: 'vae',
    source: 'huggingface',
    hfRepoId: 'stabilityai/sd-vae-ft-mse-original',
    hfFilename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    filename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    sharedDestination: 'shared/vae/vae-ft-mse-840000-ema-pruned.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description:
      'SD VAE ft-MSE for SD 2.x. Identical file to sd1-vae-ft-mse — resolves to ' +
      'models/shared/vae/. Only downloaded once regardless of which preset triggers it.',
  },

  // ── SD 3 / 3.5 ───────────────────────────────────────────────────────────
  //
  // Single-file checkpoints embed VAE and text encoders internally.
  // Pass just --pretrained_model_name_or_path; sd3_train_network.py detects
  // components automatically. Use the separate encoder presets below only for
  // split-file setups or to override individual components.

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
    description: 'SD 3.5 Medium (single-file, includes VAE + all text encoders). Gated — set HF_TOKEN.',
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
    description: 'SD 3 Medium (single-file, includes VAE + all text encoders). Gated — set HF_TOKEN.',
  },

  // SD3 separate text encoders — for split-file setups or encoder overrides.
  // CLIP-L and T5-XXL: same files as FLUX → sharedDestination.
  // CLIP-G: SD3-specific (NOT shared with other architectures).

  {
    id: 'sd3-clip-l',
    name: 'CLIP-L (SD3 / FLUX shared)',
    arch: 'sd3',
    role: 'clip_l',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 'clip_l.safetensors',
    filename: 'clip_l.safetensors',
    sharedDestination: 'shared/text_encoders/clip_l.safetensors',
    sizeMb: 246,
    requiresHfToken: false,
    description:
      'CLIP-L for SD3/SD3.5 split-file setup. Same file as flux-clip-l — resolves to ' +
      'models/shared/text_encoders/. No token required.',
  },
  {
    id: 'sd3-clip-g',
    name: 'CLIP-G (SD3 / SD3.5 only)',
    arch: 'sd3',
    role: 'clip_g',
    source: 'huggingface',
    hfRepoId: 'stabilityai/stable-diffusion-3.5-large',
    hfFilename: 'text_encoders/clip_g.safetensors',
    filename: 'clip_g.safetensors',
    sizeMb: 1_380,
    requiresHfToken: true,
    description:
      'CLIP-G (OpenCLIP ViT-bigG) for SD3/SD3.5 split-file setup. ' +
      'NOT used by FLUX or Chroma — goes to models/sd3/text_encoders/. Gated — set HF_TOKEN.',
  },
  {
    id: 'sd3-t5xxl-fp16',
    name: 'T5-XXL fp16 (SD3 / FLUX / Chroma shared)',
    arch: 'sd3',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp16.safetensors',
    filename: 't5xxl_fp16.safetensors',
    sharedDestination: 'shared/text_encoders/t5xxl_fp16.safetensors',
    sizeMb: 9_800,
    requiresHfToken: false,
    description:
      'T5-XXL fp16 for SD3/SD3.5 split-file setup. Same file as flux-t5xxl-fp16 — resolves to ' +
      'models/shared/text_encoders/. No token required.',
  },
  {
    id: 'sd3-t5xxl-fp8',
    name: 'T5-XXL fp8 (SD3 / FLUX / Chroma shared, quantized)',
    arch: 'sd3',
    role: 't5xxl',
    source: 'huggingface',
    hfRepoId: 'comfyanonymous/flux_text_encoders',
    hfFilename: 't5xxl_fp8_e4m3fn.safetensors',
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    sharedDestination: 'shared/text_encoders/t5xxl_fp8_e4m3fn.safetensors',
    sizeMb: 4_900,
    requiresHfToken: false,
    description:
      'T5-XXL fp8 for SD3/SD3.5. Same file as flux-t5xxl-fp8 — resolves to ' +
      'models/shared/text_encoders/. Recommended for <12 GB VRAM.',
  },

  // ── Lumina Image 2.0 ─────────────────────────────────────────────────────
  //
  // AE is identical to FLUX AE → sharedDestination.
  // Gemma2 text encoder is Lumina-specific — goes to lumina/text_encoders/.

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
    description:
      'Lumina Image 2.0 Next-DiT (bf16). Requires Gemma2 text encoder (lumina2-gemma2) + ' +
      'AE (flux-ae or lumina2-ae — same file).',
  },
  {
    id: 'lumina2-gemma2',
    name: 'Gemma2 2B fp16 (Lumina text encoder)',
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
    name: 'Lumina Image 2.0 AE (shared with FLUX / Chroma)',
    arch: 'lumina',
    role: 'ae',
    source: 'huggingface',
    hfRepoId: 'Comfy-Org/Lumina_Image_2.0_Repackaged',
    hfFilename: 'split_files/vae/ae.safetensors',
    filename: 'ae.safetensors',
    sharedDestination: 'shared/ae/ae.safetensors',
    sizeMb: 335,
    requiresHfToken: false,
    description:
      'AutoEncoder for Lumina Image 2.0. Identical to FLUX AE — resolves to models/shared/ae/ae.safetensors. ' +
      'If flux-ae or chroma-ae was already downloaded, this is already present.',
  },

  // ── HunyuanImage 2.1 ─────────────────────────────────────────────────────
  //
  // All components are HunyuanImage-specific — no shared files with other archs.
  // Text encoders: Qwen2.5-VL 7B (--text_encoder) + byT5-small (--byt5).
  // VAE: HunyuanImage-specific, NOT compatible with SDXL/SD3/FLUX/AE.

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
    description: 'HunyuanImage 2.1 DiT. Requires Qwen2.5-VL + byT5 text encoders + HunyuanImage VAE.',
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
    description: 'Qwen2.5-VL 7B — primary text encoder for HunyuanImage 2.1. ~15 GB.',
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
    description: 'byT5-small (GlyphXL, fp16) — secondary text encoder for HunyuanImage 2.1.',
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
    description:
      'HunyuanImage 2.1 VAE (fp16). NOT compatible with SDXL, SD3, FLUX AE, or other architecture VAEs.',
  },

  // ── Anima ─────────────────────────────────────────────────────────────────

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
    description: 'Qwen-Image VAE for Anima. NOT compatible with SDXL, SD3, FLUX AE, or other architecture VAEs.',
  },
  {
    id: 'anima-qwen3-06b',
    name: 'Qwen3-0.6B Base (Anima text encoder)',
    arch: 'anima',
    role: 'qwen3',
    source: 'huggingface',
    hfRepoId: 'circlestone-labs/Anima',
    hfFilename: 'split_files/text_encoders/qwen_3_06b_base.safetensors',
    filename: 'qwen_3_06b_base.safetensors',
    sizeMb: 1_190,
    requiresHfToken: false,
    description: 'Qwen3-0.6B Base — text encoder for Anima. Passed as --qwen3.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/** Return presets grouped by architecture, or filtered flat array for a specific arch */
export function getPresetsByArch(
  arch?: string,
): ModelPreset[] | Record<string, ModelPreset[]> {
  if (arch) {
    return MODEL_PRESETS.filter((p) => p.arch === arch);
  }

  return MODEL_PRESETS.reduce<Record<string, ModelPreset[]>>((acc, preset) => {
    (acc[preset.arch] ??= []).push(preset);
    return acc;
  }, {});
}

/** Look up a single preset by its stable id */
export function findPreset(id: string): ModelPreset | undefined {
  return MODEL_PRESETS.find((p) => p.id === id);
}