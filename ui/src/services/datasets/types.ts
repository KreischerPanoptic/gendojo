// ─────────────────────────────────────────────────────────────────────────────
// Caption type & prepend mode
// ─────────────────────────────────────────────────────────────────────────────

import type { CaptionStatsDto, DatasetMetaDto, PrependTokenDto } from '@api/types.gen'

export type CaptionType = DatasetMetaDto['captionType']

export type PrependMode = PrependTokenDto['mode']

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

export type CaptionStats = CaptionStatsDto;

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
// Types from generated OpenAPI schema
// ─────────────────────────────────────────────────────────────────────────────
 
export type {
  DatasetSummaryDto         as DatasetSummary,
  DatasetDetailDto          as DatasetDetail,
  DatasetMetaDto            as DatasetMeta,
  UploadResultDto           as UploadDatasetResponse,
  InitChunkedUploadResponseDto as InitChunkedUploadResponse,
  GetCaptionResponseDto     as GetCaptionResponse,
  UpsertCaptionResponseDto  as UpsertCaptionResponse,
  DeleteCaptionResponseDto  as DeleteCaptionResponse,
  PrependTokenResultDto     as PrependTokenResult,
  DetectCaptionTypeResultDto as CaptionTypeDetectionResult,
  DeleteImageResponseDto    as DeleteImageResponse,
  DeleteDatasetResponseDto  as DeleteDatasetResponse,
  ReplaceImageResponseDto   as ReplaceImageResponse,
  UpdateMetaDto             as DatasetMetaUpdate,
  DatasetImageDto           as DatasetImage,
  UpdateMetaDto             as UpdateMeta,
  PrependTokenDto,
  UpsertCaptionDto,
} from '@api/types.gen'
 
// ─────────────────────────────────────────────────────────────────────────────
// Manual types — not in OpenAPI spec (XHR upload progress)
// ─────────────────────────────────────────────────────────────────────────────
 
/** XHR upload progress event — mirrors ProgressEvent but serializable */
export interface UploadProgressEvent {
  /** 0–100 */
  percent: number
  /** Bytes transferred so far */
  loaded: number
  /** Total file size in bytes */
  total: number
}