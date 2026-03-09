import { apiClient } from '@services/client'
import type { JobOutputs } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getBaseURL = (): string =>
  (import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
    : '') + '/api'

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export const outputsApi = {
  /**
   * GET /jobs/:id/outputs
   * Safe to poll — returns empty lists while training is in progress.
   */
  getOutputs: async (jobId: string): Promise<JobOutputs> => {
    const { data } = await apiClient.get<JobOutputs>(`/jobs/${jobId}/outputs`)
    return data
  },

  /**
   * Direct URL for a sample preview PNG.
   * Endpoint is @SkipAuth — safe to use in <img src>.
   */
  getPreviewUrl: (jobId: string, filename: string): string =>
    `${getBaseURL()}/jobs/${jobId}/outputs/previews/${encodeURIComponent(filename)}`,

  /**
   * Downloads a checkpoint .safetensors file.
   * Uses apiClient so the Authorization header is attached.
   * Triggers browser download via a blob URL.
   */
  downloadCheckpoint: async (jobId: string, filename: string): Promise<void> => {
    const response = await apiClient.get(
      `/jobs/${jobId}/outputs/download/${encodeURIComponent(filename)}`,
      { responseType: 'blob' },
    )
    const blob = response.data as Blob
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}