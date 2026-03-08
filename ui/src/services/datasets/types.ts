// ─────────────────────────────────────────────────────────────────────────────
// List / summary
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetSummary {
  name: string
  path: string
  imageCount: number
  captionedCount: number
  /** 0–1 fraction — e.g. 0.87 = 87% captioned */
  captionCoverage: number
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail (single dataset with image list)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetImage {
  filename: string
  path: string
  sizeBytes: number
  hasCaption: boolean
}

export interface DatasetDetail extends DatasetSummary {
  images: DatasetImage[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDatasetRequest {
  /** FormData with field "file" containing a .zip archive */
  file: File
}

export interface UploadDatasetResponse {
  name: string
  imageCount: number
  extractedCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload progress (used by the mutation callback)
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadProgressEvent {
  percent: number
  loaded: number
  total: number
}