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

  'flux1-dev.safetensors':       '4610115bb0c89560703c892c59ac2742fa821e60ef5871b33493ba544683abd7',  // black-forest-labs/FLUX.1-dev
  'flux1-schnell.safetensors':   '9403429e0052277ac2a87ad800adece5481eecefd9ed334e1f348723621d2a0a',  // black-forest-labs/FLUX.1-schnell
  'ae.safetensors':              'afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38',  // black-forest-labs/FLUX.1-dev → ae (shared with chroma + lumina)
  'clip_l.safetensors':          '660c6f5b1abae9dc498ac2d21e1347d2abdb0cf6c0c0c8576cd796491d9a6cdd',  // comfyanonymous/flux_text_encoders
  't5xxl_fp16.safetensors':      '6e480b09fae049a72d2a8c5fbccb8d3e92febeb233bbe9dfe7256958a9167635',  // comfyanonymous/flux_text_encoders
  't5xxl_fp8_e4m3fn.safetensors': '7d330da4816157540d6bb7838bf63a0f02f573fc48ca4d8de34bb0cbfd514f09',  // comfyanonymous/flux_text_encoders

  // ── Chroma ────────────────────────────────────────────────────────────────
  // ae / t5xxl shared with FLUX — same filename, same hash

  'chroma-unlocked-v50.safetensors': 'd845553f11e6afe8139c41ca73678f9f03eab2e68d2e1c6f03ae19509a43d546',  // lodestones/Chroma
  'Chroma1-Base.safetensors':     '504e32fe23976cfd317fd388401c51e70f424fec7f94195abb0ced0972898baf',  // lodestones/Chroma1-Base
  'Chroma1-HD.safetensors': 'd446d9695d08276f61e53653e025289dd96f7a489c27982a1fa54ecabc06642a', // lodestones/Chroma1-HD
  'Chroma1-HD-Flash.safetensors': '2c0c7d908d04418a48b453c293237a9826d54472cf0ba76e28697d1309d1021b', // lodestones/Chroma1-Flash

  // ── SDXL ─────────────────────────────────────────────────────────────────

  'sd_xl_base_1.0.safetensors':       '31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b',  // stabilityai/stable-diffusion-xl-base-1.0
  'sdxl_vae_fp16_fix.safetensors':    '235745af8d86bf4a4c1b5b4f529868b37019a10f7c0b2e79ad0abca3a22bc6e1',  // madebyollin/sdxl-vae-fp16-fix

  // ── SD 1.x ────────────────────────────────────────────────────────────────

  'v1-5-pruned-emaonly.safetensors':          '6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa',  // stable-diffusion-v1-5
  'vae-ft-mse-840000-ema-pruned.safetensors': '735e4c3a447a3255760d7f86845f09f937809baa529c17370d83e4c3758f3c75',  // stabilityai/sd-vae-ft-mse-original

  // ── SD 2.x ────────────────────────────────────────────────────────────────

  'v2-1_768-ema-pruned.safetensors': 'dcd690123cfc64383981a31d955694f6acf2072a80537fdb612c8e58ec87a8ac',  // sd2-community/stable-diffusion-2-1

  // ── SD 3 / 3.5 ───────────────────────────────────────────────────────────

  'sd3.5_large.safetensors':  'ffef7a279d9134626e6ce0d494fba84fc1c7e720b3c7df2d19a09dc3796d8f93',  // stabilityai/stable-diffusion-3.5-large
  'sd3.5_medium.safetensors': '11fe06e22364b823dfeedc275912336b932b32a293a0b2f35ffac071990cc4de',  // stabilityai/stable-diffusion-3.5-medium
  'sd3_medium.safetensors': 'cc236278d28c8c3eccb8e21ee0a67ebed7dd6e9ce40aa9de914fa34e8282f191',  // stabilityai/stable-diffusion-3-medium
  'clip_g.safetensors':       'ec310df2af79c318e24d20511b601a591ca8cd4f1fce1d8dff822a356bcdb1f4',  // stabilityai/stable-diffusion-3.5-large → text_encoders/clip_g

  // ── Lumina Image 2.0 ─────────────────────────────────────────────────────

  'lumina_2_model_bf16.safetensors': '736e7a524186c943568dfe688d87ce3556cfbd97f7026125065b0aa44c351f6a',  // Comfy-Org/Lumina_Image_2.0_Repackaged
  'gemma_2_2b_fp16.safetensors':     '29761442862f8d064d3f854bb6fabf4379dcff511a7f6ba9405a00bd0f7e2dbd',  // Comfy-Org/Lumina_Image_2.0_Repackaged

  // ── HunyuanImage 2.1 ─────────────────────────────────────────────────────

  'hunyuanimage2.1.safetensors':           '049634539c631a6c097d989efc2f29942637ddbb718a834a13d0c8cba22cf087',  // tencent/HunyuanImage-2.1
  'qwen_2.5_vl_7b.safetensors':            'cfafd739459bc86257397259f612a9aee88e5b98e85b5c0d0d1717e898b3463a',  // Comfy-Org/HunyuanImage_2.1_ComfyUI
  'byt5_small_glyphxl_fp16.safetensors':   '516910bb4c9b225370290e40585d1b0e6c8cd3583690f7eec2f7fb593990fb48',  // Comfy-Org/HunyuanImage_2.1_ComfyUI
  'hunyuan_image_2.1_vae_fp16.safetensors':'f2ae19863609206196b5e3a86bfd94f67bd3866f5042004e3994f07e3c93b2f9',  // Comfy-Org/HunyuanImage_2.1_ComfyUI

  // ── Anima ────────────────────────────────────────────────────────────────

  'anima-preview.safetensors':  '41fa7b78613dfe0d888b3647f70c7fb8cdfda2ff177e78d2e16e06dc810d9dcc',  // circlestone-labs/Anima
  'qwen_image_vae.safetensors': 'a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f',  // circlestone-labs/Anima
  'qwen_3_06b_base.safetensors': 'cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba',  // circlestone-labs/Anima
};