// ─────────────────────────────────────────────────────────────────────────────
// Types from generated OpenAPI schema
// ─────────────────────────────────────────────────────────────────────────────

import type { DownloadJobDto } from '@api/types.gen'

export type {
  PresetDto,
  PresetsGroupedDto,
  DownloadJobDto,
  StartDownloadDto
} from '@api/types.gen'

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_COLOR: Record<DownloadJobDto['status'], string> = {
  pending:     'gray',
  downloading: 'blue',
  completed:   'teal',
  failed:      'red',
  cancelled:   'orange',
  skipped:     'slate'
}

export const STATUS_LABEL: Record<DownloadJobDto['status'], string> = {
  pending:     'Pending',
  downloading: 'Downloading',
  completed:   'Done',
  failed:      'Failed',
  cancelled:   'Cancelled',
  skipped:     'Skipped'
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  const GiB = 1024 ** 3
  const MiB = 1024 ** 2
  if (bytes >= GiB) return `${(bytes / GiB).toFixed(2)} GB`
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}