// ─────────────────────────────────────────────────────────────────────────────
// Mirror of api/src/downloader/downloader.types.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { ModelArchitecture, ModelRole } from '@services/models'

export type DownloadSource = 'huggingface' | 'civitai' | 'direct'

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface DownloadJob {
  id: string
  source: DownloadSource
  url: string
  arch: ModelArchitecture
  role: ModelRole
  filename: string
  destination: string
  status: DownloadStatus
  bytesDownloaded: number
  /** 0 until Content-Length is received from server */
  bytesTotal: number
  /** 0–100; -1 when total is unknown (chunked transfer) */
  progressPercent: number
  createdAt: string
  completedAt?: string
  error?: string
}

export interface ModelPreset {
  id: string
  name: string
  arch: ModelArchitecture
  role: ModelRole
  source: DownloadSource
  hfRepoId?: string
  hfFilename?: string
  filename: string
  sizeMb?: number
  requiresHfToken: boolean
  description?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Request bodies
// ─────────────────────────────────────────────────────────────────────────────

export interface StartDownloadByPreset {
  presetId: string
}

export interface StartDownloadByUrl {
  url: string
  arch: ModelArchitecture
  role: ModelRole
  filename?: string
}

export type StartDownloadRequest = StartDownloadByPreset | StartDownloadByUrl

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_COLOR: Record<DownloadStatus, string> = {
  pending:     'gray',
  downloading: 'blue',
  completed:   'teal',
  failed:      'red',
  cancelled:   'orange',
}

export const STATUS_LABEL: Record<DownloadStatus, string> = {
  pending:     'Pending',
  downloading: 'Downloading',
  completed:   'Done',
  failed:      'Failed',
  cancelled:   'Cancelled',
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  const GiB = 1024 ** 3
  const MiB = 1024 ** 2
  if (bytes >= GiB) return `${(bytes / GiB).toFixed(2)} GB`
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}