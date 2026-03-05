import { apiClient } from '@services/client'
import type {
  DatasetDetail,
  DatasetSummary,
  UploadDatasetResponse,
  UploadProgressEvent,
} from './types'

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
   * POST /datasets/upload
   * Uploads a .zip archive. Uses XHR so we can track upload progress.
   *
   * @param file        - .zip File object
   * @param onProgress  - called with progress events (0–100%)
   */
  upload: (
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<UploadDatasetResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      const token = (() => {
        try {
          const raw = localStorage.getItem('gendojo_auth')
          const parsed = JSON.parse(raw ?? '{}') as { state?: { token?: string } }
          return parsed?.state?.token ?? null
        } catch {
          return null
        }
      })()

      const baseURL =
        (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${baseURL}/datasets/upload`)

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

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
            resolve(JSON.parse(xhr.responseText) as UploadDatasetResponse)
          } catch {
            resolve({ name: file.name, imageCount: 0, extractedCount: 0 })
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
  },

  /**
   * DELETE /datasets/:name
   * Removes the dataset directory and all its contents.
   */
  remove: async (name: string): Promise<void> => {
    await apiClient.delete(`/datasets/${encodeURIComponent(name)}`)
  },
}