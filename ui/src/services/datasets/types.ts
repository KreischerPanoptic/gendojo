// ─────────────────────────────────────────────────────────────────────────────
// Caption type & prepend mode
// ─────────────────────────────────────────────────────────────────────────────

export type CaptionType = 'tag_list' | 'natural_language' | 'mixed' | 'unknown'

export type PrependMode = 'tag_list' | 'nl_prefix' | 'nl_style' | 'nl_character'

export const PREPEND_MODE_LABELS: Record<PrependMode, string> = {
  tag_list:     'Tag list  →  token, <rest>',
  nl_prefix:    'NL prefix  →  token. <rest>',
  nl_style:     'NL style  →  In style of token, <rest>',
  nl_character: 'NL character  →  token character, <rest>',
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption length stats
// ─────────────────────────────────────────────────────────────────────────────

export const CAPTION_LENGTH_THRESHOLDS = {
  /** CLIP BPE 77 tok ≈ 200 chars — SD 1/2/SDXL */
  CLIP: 200,
  /** T5 256 tok ≈ 900 chars — FLUX / SD3 / Hunyuan */
  T5: 900,
} as const

export interface CaptionStats {
  charCount: number
  wordCount: number
  isLongForClip: boolean
  isLongForT5: boolean
}

/**
 * Compute CaptionStats client-side. Mirrors the backend logic so the editor
 * can show real-time feedback without a round-trip.
 */
export function computeCaptionStats(text: string): CaptionStats {
  const trimmed = text.trim()
  const charCount = trimmed.length
  const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length
  return {
    charCount,
    wordCount,
    isLongForClip: charCount > CAPTION_LENGTH_THRESHOLDS.CLIP,
    isLongForT5:   charCount > CAPTION_LENGTH_THRESHOLDS.T5,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetMeta {
  activationToken: string | null
  captionType: CaptionType
  notes: string
  createdAt: string
}

export type DatasetMetaUpdate = Partial<
  Pick<DatasetMeta, 'activationToken' | 'captionType' | 'notes'>
>

// ─────────────────────────────────────────────────────────────────────────────
// Image record
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetImage {
  filename: string
  path: string
  sizeBytes: number
  hasCaption: boolean
  /** null when hasCaption is false */
  captionStats: CaptionStats | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset summary (GET /datasets)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetSummary {
  name: string
  path: string
  imageCount: number
  captionedCount: number
  /** 0–1 fraction */
  captionCoverage: number
  updatedAt: string
  /** null when dataset.meta.json doesn't exist yet */
  meta: DatasetMeta | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset detail (GET /datasets/:name)
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptionLengthSummary {
  longForClipCount: number
  longForT5Count:   number
  avgCharCount:     number
  avgWordCount:     number
}

export interface DatasetDetail extends DatasetSummary {
  images: DatasetImage[]
  /** null when no captions are present */
  captionLengthSummary: CaptionLengthSummary | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDatasetRequest {
  file: File
}

export interface UploadDatasetResponse {
  name: string
  imageCount: number
  extractedCount: number
}

export interface UploadProgressEvent {
  percent: number
  loaded:  number
  total:   number
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption detection
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptionTypeDetectionResult {
  captionType:  CaptionType
  sampleSize:   number
  tagListRatio: number
  meta:         DatasetMeta
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepend token
// ─────────────────────────────────────────────────────────────────────────────

export interface PrependTokenResult {
  updated: number
  skipped: number
  missing: number
}