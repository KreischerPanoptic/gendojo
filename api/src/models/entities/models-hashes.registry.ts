/**
 * Known SHA-256 hashes for model files.
 *
 * Key   = filename as it appears on disk (basename only, no path).
 * Value = expected SHA-256 hex string — lowercase, 64 chars, no spaces.
 *
 * How to get hashes from HuggingFace:
 *   1. Go to the model repo → Files tab
 *   2. Click the file → click "Copy SHA256" icon next to the size
 *   OR use the HF API:
 *   curl -sI https://huggingface.co/{repo}/resolve/main/{file} | grep x-linked-etag
 *
 * Leave a line commented out if you don't have the hash yet.
 * Integrity checks return status='unknown' for any file not listed here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Example (fill in the real hash):
 *
 *   'flux1-dev.safetensors': '41fa7b78613dfe0d888b3647f70c7fb8cdfda2ff177e78d2e16e06dc810d9dcc',
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const FILE_HASHES: Record<string, string> = {

  // ── FLUX.1 ────────────────────────────────────────────────────────────────

  // 'flux1-dev.safetensors':       '',  // black-forest-labs/FLUX.1-dev
  // 'flux1-schnell.safetensors':   '',  // black-forest-labs/FLUX.1-schnell
  // 'ae.safetensors':              '',  // black-forest-labs/FLUX.1-dev → ae (shared with chroma + lumina)
  // 'clip_l.safetensors':          '',  // comfyanonymous/flux_text_encoders
  // 't5xxl_fp16.safetensors':      '',  // comfyanonymous/flux_text_encoders
  // 't5xxl_fp8_e4m3fn.safetensors':'',  // comfyanonymous/flux_text_encoders

  // ── Chroma ────────────────────────────────────────────────────────────────
  // ae / t5xxl shared with FLUX — same filename, same hash

  // 'chroma-unlocked.safetensors': '',  // lodestones/Chroma
  // 'Chroma-base.safetensors':     '',  // lodestones/Chroma1-Base

  // ── SDXL ─────────────────────────────────────────────────────────────────

  // 'sd_xl_base_1.0.safetensors':       '',  // stabilityai/stable-diffusion-xl-base-1.0
  // 'sdxl_vae_fp16_fix.safetensors':    '',  // madebyollin/sdxl-vae-fp16-fix

  // ── SD 1.x ────────────────────────────────────────────────────────────────

  // 'v1-5-pruned-emaonly.safetensors':          '',  // stable-diffusion-v1-5
  // 'vae-ft-mse-840000-ema-pruned.safetensors': '',  // stabilityai/sd-vae-ft-mse-original

  // ── SD 2.x ────────────────────────────────────────────────────────────────

  // 'v2-1_768-ema-pruned.safetensors': '',  // stabilityai/stable-diffusion-2-1

  // ── SD 3 / 3.5 ───────────────────────────────────────────────────────────

  // 'sd3.5_large.safetensors':  '',  // stabilityai/stable-diffusion-3.5-large
  // 'sd3.5_medium.safetensors': '',  // stabilityai/stable-diffusion-3.5-medium
  // 'clip_g.safetensors':       '',  // stabilityai/stable-diffusion-3.5-large → text_encoders/clip_g

  // ── Lumina Image 2.0 ─────────────────────────────────────────────────────

  // 'lumina_2_model_bf16.safetensors': '',  // Comfy-Org/Lumina_Image_2.0_Repackaged
  // 'gemma_2_2b_fp16.safetensors':     '',  // Comfy-Org/Lumina_Image_2.0_Repackaged

  // ── HunyuanImage 2.1 ─────────────────────────────────────────────────────

  // 'hunyuanimage2.1.safetensors':           '',  // tencent/HunyuanImage-2.1
  // 'qwen_2.5_vl_7b.safetensors':            '',  // Comfy-Org/HunyuanImage_2.1_ComfyUI
  // 'byt5_small_glyphxl_fp16.safetensors':   '',  // Comfy-Org/HunyuanImage_2.1_ComfyUI
  // 'hunyuan_image_2.1_vae_fp16.safetensors':'',  // Comfy-Org/HunyuanImage_2.1_ComfyUI

  // ── Anima ────────────────────────────────────────────────────────────────

  'anima-preview.safetensors':  '41fa7b78613dfe0d888b3647f70c7fb8cdfda2ff177e78d2e16e06dc810d9dcc',  // circlestone-labs/Anima
  'qwen_image_vae.safetensors': 'a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f',  // circlestone-labs/Anima
  'qwen_3_06b_base.safetensors': 'cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba',  // circlestone-labs/Anima
};