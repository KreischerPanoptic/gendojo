export enum Theme {
  AUTO = 'auto',
  LIGHT = 'light',
  DARK = 'dark',
}

export enum TokenType {
  HF = 'huggingface',
  CAI = 'civitait',
}

export enum ModelArchitecture {
  SD1 = 'sd1',
  SD2 = 'sd2',
  SDXL = 'sdxl',
  SD3 = 'sd3',
  FLUX_1 = 'flux.1',
  Chroma = 'chroma', // FLUX variant — no CLIP-L, guidance_scale=0
  Anima = 'anima',
  Lumina2 = 'lumina-2.0',
  Hunyuan2_1 = 'hunyuan-2.1',
  Unknown = 'unknown',
}

export enum ModelProvider {
  HF = 'huggingface',
  CAI = 'civitai',
  LOCAL = 'local',
  UNKNOWN = 'unknown',
}

export enum ModelStatus {
  READY = 'ready',
  DOWNLOADING = 'downloading',
  MISSING = 'file_missing',
  ERROR = 'error',
}

export enum ModelIntegrityStatus {
  OK = 'ok',
  CORRUPTED = 'corrupted',
  UNKNOWN = 'unknown',
}
