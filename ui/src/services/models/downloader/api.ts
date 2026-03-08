import { apiClient } from '@services/client'
import type {
  DownloadJob,
  ModelPreset,
  StartDownloadRequest,
} from './types'
import type { ModelArchitecture } from '@services/models'

// ─────────────────────────────────────────────────────────────────────────────

export const downloaderApi = {
  /**
   * GET /downloader/presets
   * Returns all presets grouped by arch: Record<arch, ModelPreset[]>
   *
   * GET /downloader/presets?arch=flux
   * Returns flat array for a specific arch: ModelPreset[]
   */
  listPresets: async (): Promise<Record<string, ModelPreset[]>> => {
    const { data } = await apiClient.get<Record<string, ModelPreset[]>>('/downloader/presets')
    return data
  },

  listPresetsByArch: async (arch: ModelArchitecture): Promise<ModelPreset[]> => {
    const { data } = await apiClient.get<ModelPreset[]>('/downloader/presets', {
      params: { arch },
    })
    return data
  },

  /**
   * GET /downloader
   * All jobs, newest first.
   */
  listJobs: async (): Promise<DownloadJob[]> => {
    const { data } = await apiClient.get<DownloadJob[]>('/downloader')
    return data
  },

  /**
   * GET /downloader/:id
   */
  getJob: async (id: string): Promise<DownloadJob> => {
    const { data } = await apiClient.get<DownloadJob>(`/downloader/${id}`)
    return data
  },

  /**
   * POST /downloader
   * Start a new download. Returns the job immediately.
   */
  start: async (body: StartDownloadRequest): Promise<DownloadJob> => {
    const { data } = await apiClient.post<DownloadJob>('/downloader', body)
    return data
  },

  /**
   * DELETE /downloader/:id
   * Cancel an in-progress or pending download.
   */
  cancel: async (id: string): Promise<DownloadJob> => {
    const { data } = await apiClient.delete<DownloadJob>(`/downloader/${id}`)
    return data
  },
}