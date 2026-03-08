import { apiClient } from '@services/client'
import type {
  DatasetDetail,
  DatasetSummary,
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
  : '') + '/api';

/**
 * Generic XHR upload with optional progress tracking.
 * Used for both zip and individual file uploads.
 */
function xhrUpload<T>(
  url: string,
  formData: FormData,
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const xhr = new XMLHttpRequest()

    xhr.open('POST', url)
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
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          resolve({} as T)
        }
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
  /**
   * GET /datasets
   * Returns all dataset directories sorted by updatedAt desc.
   */
  list: async (): Promise<DatasetSummary[]> => {
    const { data } = await apiClient.get<DatasetSummary[]>('/datasets')
    return data
  },

  /**
   * GET /datasets/:name
   * Returns full detail including image list.
   */
  getOne: async (name: string): Promise<DatasetDetail> => {
    const { data } = await apiClient.get<DatasetDetail>(`/datasets/${encodeURIComponent(name)}`)
    return data
  },

  /**
   * POST /datasets/upload/zip
   *
   * Uploads a .zip archive. The backend extracts it into
   * /workspace/datasets/<name>/ flattening one level of nesting.
   *
   * @param name       - Target dataset directory name
   * @param file       - .zip File object
   * @param onProgress - Progress callback (0–100%)
   * @param overwrite  - Merge into existing dataset (default true)
   */
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
      `${getBaseURL()}/datasets/upload/zip${qs}`,
      formData,
      onProgress,
    )
  },

  /**
   * POST /datasets/upload/files?name=<name>
   *
   * Uploads individual image (.jpg/.jpeg/.png/.webp) or caption (.txt) files.
   * Max 50 files per request. Creates the dataset directory if it doesn't exist.
   *
   * @param name       - Target dataset directory name
   * @param files      - Array of File objects
   * @param onProgress - Progress callback (0–100%)
   */
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
   * GET /datasets/:name/captions/:image
   *
   * Returns { caption: string } if the .txt file exists,
   * or { caption: null } if the image has no caption yet.
   */
  getCaption: async (
    datasetName: string,
    imageName: string,
  ): Promise<{ caption: string | null }> => {
    const { data } = await apiClient.get<{ caption: string | null }>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/${encodeURIComponent(imageName)}`,
    )
    return data
  },

  /**
   * POST /datasets/:name/captions/:image
   *
   * Creates or overwrites the .txt caption file for a given image.
   * The image must already exist in the dataset.
   *
   * @param datasetName  - Dataset directory name
   * @param imageName    - Image filename (e.g. "cat_001.jpg")
   * @param caption      - Caption text content
   */
  upsertCaption: async (
    datasetName: string,
    imageName: string,
    caption: string,
  ): Promise<{ captionPath: string }> => {
    const { data } = await apiClient.post<{ captionPath: string }>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/${encodeURIComponent(imageName)}`,
      { caption },
    )
    return data
  },

  /**
   * Returns the URL to fetch an image file from a dataset.
   * Resolves against VITE_API_URL so it can be used in <img src=...>.
   *
   * @param datasetName - Dataset directory name
   * @param filename    - Image filename (e.g. "cat_001.jpg")
   */
  getImageUrl: (datasetName: string, filename: string): string => {
    return `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`
  },

  /**
   * DELETE /datasets/:name
   * Removes the dataset directory and all its contents.
   */
  remove: async (name: string): Promise<void> => {
    await apiClient.delete(`/datasets/${encodeURIComponent(name)}`)
  },
}