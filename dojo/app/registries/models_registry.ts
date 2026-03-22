/**
 * Known SHA-256 hashes for model files.
 * Key   = filename as it appears on disk (basename only, no path).
 * Value = expected SHA-256 hex string — lowercase, 64 chars, no spaces.
 */
export const FILE_HASHES: Record<string, string> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. UNIVERSAL SHARED COMPONENTS (Architecture: null)
  // These are the workhorse parts shared across multiple ecosystems.
  // ─────────────────────────────────────────────────────────────────────────────

  // AutoEncoders
  'ae.safetensors': 'afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38', // FLUX / Chroma / Lumina
  'vae-ft-mse-840000-ema-pruned.safetensors':
    '735e4c3a447a3255760d7f86845f09f937809baa529c17370d83e4c3758f3c75', // SD1.5 (Often universally shared)

  // Text Encoders (T5 Family)
  't5xxl_fp16.safetensors': '6e480b09fae049a72d2a8c5fbccb8d3e92febeb233bbe9dfe7256958a9167635', // FLUX / SD3 / Lumina / Chroma
  't5xxl_fp8_e4m3fn.safetensors':
    '7d330da4816157540d6bb7838bf63a0f02f573fc48ca4d8de34bb0cbfd514f09',

  // Text Encoders (CLIP Family)
  'clip_l.safetensors': '660c6f5b1abae9dc498ac2d21e1347d2abdb0cf6c0c0c8576cd796491d9a6cdd', // FLUX / SD3 / SDXL / SD1
  'clip_g.safetensors': 'ec310df2af79c318e24d20511b601a591ca8cd4f1fce1d8dff822a356bcdb1f4', // SD3 / SDXL
  'clip_h.safetensors': '0084e75319a50ad85ef45377bad5bc38f2f58824459eb690048d51c9f8863be5', // SD2

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ARCHITECTURE-SPECIFIC COMPONENTS
  // These are components bound tightly to a single architecture.
  // ─────────────────────────────────────────────────────────────────────────────

  // SDXL
  'sdxl_vae_fp16_fix.safetensors':
    '235745af8d86bf4a4c1b5b4f529868b37019a10f7c0b2e79ad0abca3a22bc6e1',

  // Lumina 2.0
  'gemma_2_2b_fp16.safetensors': '29761442862f8d064d3f854bb6fabf4379dcff511a7f6ba9405a00bd0f7e2dbd',

  // HunyuanImage 2.1
  'qwen_2.5_vl_7b.safetensors': 'cfafd739459bc86257397259f612a9aee88e5b98e85b5c0d0d1717e898b3463a',
  'byt5_small_glyphxl_fp16.safetensors':
    '516910bb4c9b225370290e40585d1b0e6c8cd3583690f7eec2f7fb593990fb48',
  'hunyuan_image_2.1_vae_fp16.safetensors':
    'f2ae19863609206196b5e3a86bfd94f67bd3866f5042004e3994f07e3c93b2f9',

  // Anima
  'qwen_3_06b_base.safetensors': 'cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba',
  'qwen_image_vae.safetensors': 'a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f',
  'llm_adapter.safetensors': '...', // For Anima optional LLM adapter

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. BASE ENGINES (Checkpoints & DiTs)
  // The core generators that dictate the architecture.
  // ─────────────────────────────────────────────────────────────────────────────

  // FLUX.1 (DiT)
  'flux1-dev.safetensors': '4610115bb0c89560703c892c59ac2742fa821e60ef5871b33493ba544683abd7',
  'flux1-schnell.safetensors': '9403429e0052277ac2a87ad800adece5481eecefd9ed334e1f348723621d2a0a',

  // Chroma (DiT)
  'chroma-unlocked-v50.safetensors':
    'd845553f11e6afe8139c41ca73678f9f03eab2e68d2e1c6f03ae19509a43d546',
  'Chroma1-Base.safetensors': '504e32fe23976cfd317fd388401c51e70f424fec7f94195abb0ced0972898baf',
  'Chroma1-HD.safetensors': 'd446d9695d08276f61e53653e025289dd96f7a489c27982a1fa54ecabc06642a',
  'Chroma1-HD-Flash.safetensors':
    '2c0c7d908d04418a48b453c293237a9826d54472cf0ba76e28697d1309d1021b',

  // SD3 / SD3.5
  // --- Naked DiTs ---
  'sd3.5_large.safetensors': 'ffef7a279d9134626e6ce0d494fba84fc1c7e720b3c7df2d19a09dc3796d8f93',
  'sd3.5_medium.safetensors': '11fe06e22364b823dfeedc275912336b932b32a293a0b2f35ffac071990cc4de',
  'sd3_medium.safetensors': 'cc236278d28c8c3eccb8e21ee0a67ebed7dd6e9ce40aa9de914fa34e8282f191',
  // --- Merged Checkpoints ---
  'sd3_medium_incl_clips_t5xxlfp8.safetensors':
    '92db4295e9c9ab8401ef60566d975656a35b0bd0f6d9ce0d083725171f7b3174',
  'sd3_medium_incl_clips_t5xxlfp16.safetensors':
    '69a950c5d143ce782a7423c532c8a12b75da6a37b0e6f26a322acf4e76208912',

  // SDXL (Checkpoint)
  'sd_xl_base_1.0.safetensors': '31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b',

  // SD 1.x & 2.x (Checkpoint)
  'v1-5-pruned-emaonly.safetensors':
    '6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa',
  'v2-1_768-ema-pruned.safetensors':
    'dcd690123cfc64383981a31d955694f6acf2072a80537fdb612c8e58ec87a8ac',

  // Lumina 2.0 (DiT)
  'lumina_2_model_bf16.safetensors':
    '736e7a524186c943568dfe688d87ce3556cfbd97f7026125065b0aa44c351f6a',

  // HunyuanImage 2.1 (DiT)
  'hunyuanimage2.1.safetensors': '049634539c631a6c097d989efc2f29942637ddbb718a834a13d0c8cba22cf087',

  // Anima (DiT)
  'anima-preview.safetensors': '41fa7b78613dfe0d888b3647f70c7fb8cdfda2ff177e78d2e16e06dc810d9dcc',
  'anima-preview2.safetensors': 'a21ff6807e31cbd2e6e7f24de07921b3190cd832819389f6b6b27e3a04e82f57',
}
