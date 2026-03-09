import { apiClient } from '@services/client'
import type {
  CaptionStats,
  CaptionTypeDetectionResult,
  DatasetDetail,
  DatasetMeta,
  DatasetMetaUpdate,
  DatasetSummary,
  PrependMode,
  PrependTokenResult,
  UploadDatasetResponse,
  UploadProgressEvent,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const getToken = (): string | null => {
  try {
    const raw = localStorage.getItem('gendojo_auth')
    const parsed = JSON.parse(raw ?? '{}') as { state?: { token?: string } }
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

const getBaseURL = (): string =>
  (import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
    : '') + '/api'

/**
 * Generic XHR upload with optional progress tracking.
 * Used for zip and individual file uploads where we need progress events.
 */
function xhrUpload<T>(
  method: 'POST' | 'PUT',
  url: string,
  formData: FormData,
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const xhr = new XMLHttpRequest()

    xhr.open(method, url)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            percent: Math.round((e.loaded / e.total) * 100),
            loaded: e.loaded,
            total: e.total,
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as T) }
        catch { resolve({} as T) }
      } else {
        let message = `Upload failed: HTTP ${xhr.status}`
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string }
          if (body.message) message = body.message
        } catch { /* ignore */ }
        reject(new Error(message))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.send(formData)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export const datasetsApi = {

  // ── List / detail ────────────────────────────────────────────────────────

  list: async (): Promise<DatasetSummary[]> => {
    const { data } = await apiClient.get<DatasetSummary[]>('/datasets')
    return data
  },

  getOne: async (name: string): Promise<DatasetDetail> => {
    const { data } = await apiClient.get<DatasetDetail>(
      `/datasets/${encodeURIComponent(name)}`,
    )
    return data
  },

  // ── Upload ───────────────────────────────────────────────────────────────

  uploadZip: (
    name: string,
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
    overwrite = true,
  ): Promise<UploadDatasetResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    const qs = overwrite ? '' : '?overwrite=false'
    return xhrUpload<UploadDatasetResponse>(
      'POST',
      `${getBaseURL()}/datasets/upload/zip${qs}`,
      formData,
      onProgress,
    )
  },

  uploadFiles: (
    name: string,
    files: File[],
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<UploadDatasetResponse> => {
    const loadedMap = new Map<number, number>()
    const totalBytes = files.reduce((s, f) => s + f.size, 0)

    const uploadOne = (file: File, index: number): Promise<UploadDatasetResponse> => {
      const formData = new FormData()
      formData.append('file', file)
      const perFileProgress = onProgress && totalBytes > 0
        ? (e: UploadProgressEvent) => {
            loadedMap.set(index, (e.loaded / e.total) * file.size)
            const totalLoaded = [...loadedMap.values()].reduce((s, v) => s + v, 0)
            onProgress({
              percent: Math.round((totalLoaded / totalBytes) * 100),
              loaded: Math.round(totalLoaded),
              total: totalBytes,
            })
          }
        : undefined
      return xhrUpload<UploadDatasetResponse>(
        'POST',
        `${getBaseURL()}/datasets/upload/file?name=${encodeURIComponent(name)}`,
        formData,
        perFileProgress,
      )
    }

    return Promise.all(files.map((f, i) => uploadOne(f, i))).then(
      (results) => results[results.length - 1],
    )
  },

  /**
   * PUT /datasets/:name/images/:filename
   * Replace an existing image in-place. Caption is preserved.
   * The uploaded file must share the same extension as the target filename.
   */
  replaceImage: (
    datasetName: string,
    filename: string,
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<{ path: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    return xhrUpload<{ path: string }>(
      'PUT',
      `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`,
      formData,
      onProgress,
    )
  },

  // ── Captions ─────────────────────────────────────────────────────────────

  getCaption: async (
    datasetName: string,
    imageName: string,
  ): Promise<{ caption: string | null; captionStats: CaptionStats | null }> => {
    const { data } = await apiClient.get<{ caption: string | null; captionStats: CaptionStats | null }>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/${encodeURIComponent(imageName)}`,
    )
    return data
  },

  upsertCaption: async (
    datasetName: string,
    imageName: string,
    caption: string,
  ): Promise<{ captionPath: string; captionStats: CaptionStats }> => {
    const { data } = await apiClient.post<{ captionPath: string; captionStats: CaptionStats }>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/${encodeURIComponent(imageName)}`,
      { caption },
    )
    return data
  },

  /**
   * DELETE /datasets/:name/captions/:image
   * Idempotent — returns { deleted: false } when caption was already absent.
   */
  deleteCaption: async (
    datasetName: string,
    imageName: string,
  ): Promise<{ deleted: boolean }> => {
    const { data } = await apiClient.delete<{ deleted: boolean }>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/${encodeURIComponent(imageName)}`,
    )
    return data
  },

  /**
   * POST /datasets/:name/captions/prepend-token
   * Bulk-prepend activation token to all existing captions.
   */
  prependToken: async (
    datasetName: string,
    token: string,
    mode: PrependMode,
    skipExisting: boolean,
  ): Promise<PrependTokenResult> => {
    const { data } = await apiClient.post<PrependTokenResult>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/prepend-token`,
      { token, mode, skipExisting },
    )
    return data
  },

  // ── Metadata ─────────────────────────────────────────────────────────────

  getMeta: async (datasetName: string): Promise<DatasetMeta | null> => {
    const { data } = await apiClient.get<DatasetMeta | null>(
      `/datasets/${encodeURIComponent(datasetName)}/meta`,
    )
    return data
  },

  updateMeta: async (
    datasetName: string,
    update: DatasetMetaUpdate,
  ): Promise<DatasetMeta> => {
    const { data } = await apiClient.patch<DatasetMeta>(
      `/datasets/${encodeURIComponent(datasetName)}/meta`,
      update,
    )
    return data
  },

  detectCaptionType: async (
    datasetName: string,
  ): Promise<CaptionTypeDetectionResult> => {
    const { data } = await apiClient.post<CaptionTypeDetectionResult>(
      `/datasets/${encodeURIComponent(datasetName)}/detect-caption-type`,
    )
    return data
  },

  // ── Delete ───────────────────────────────────────────────────────────────

  /**
   * DELETE /datasets/:name/images/:filename
   * Removes the image and its companion caption file if present.
   */
  deleteImage: async (
    datasetName: string,
    filename: string,
  ): Promise<{ deleted: string[]; captionDeleted: boolean }> => {
    const { data } = await apiClient.delete<{ deleted: string[]; captionDeleted: boolean }>(
      `/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`,
    )
    return data
  },

  remove: async (name: string): Promise<void> => {
    await apiClient.delete(`/datasets/${encodeURIComponent(name)}`)
  },

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * Returns the image URL for use in <img src=...>.
   * The endpoint is @SkipAuth so no token is needed in the URL.
   */
  getImageUrl: (datasetName: string, filename: string): string =>
    `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`,

  /**
   * Returns the export download URL for the dataset zip.
   * Open via window.open() or an <a href download>.
   */
  getExportUrl: (datasetName: string): string =>
    `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/export`,
}