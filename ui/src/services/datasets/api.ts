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
// Chunked upload constants
// ─────────────────────────────────────────────────────────────────────────────

/** Файлы >= этого порога уходят через chunked upload */
const CHUNK_THRESHOLD   = 10 * 1024 * 1024   // 10 MB

/** Размер одного чанка */
const CHUNK_SIZE        = 5  * 1024 * 1024   // 5 MB

/** Сколько чанков грузим параллельно */
const CHUNK_CONCURRENCY = 4

// ─────────────────────────────────────────────────────────────────────────────
// Chunked ZIP upload (internal)
// ─────────────────────────────────────────────────────────────────────────────

async function uploadZipChunked(
  name: string,
  file: File,
  onProgress?: (event: UploadProgressEvent) => void,
  overwrite = true,
): Promise<UploadDatasetResponse> {

  // 1. Инициализируем сессию
  const token = getToken()
  const baseURL = getBaseURL()

  const initRes = await fetch(`${baseURL}/datasets/upload/chunked/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name }),
  })
  if (!initRes.ok) {
    let msg = `Chunked init failed: HTTP ${initRes.status}`
    try { const b = await initRes.json() as { message?: string }; if (b.message) msg = b.message } catch {}
    throw new Error(msg)
  }
  const { uploadId } = await initRes.json() as { uploadId: string }

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  // loadedBytes[i] — сколько байт чанка i уже доехало на сервер
  const loadedBytes = new Array<number>(totalChunks).fill(0)

  const reportProgress = onProgress
    ? () => {
        const totalLoaded = loadedBytes.reduce((s, v) => s + v, 0)
        onProgress({
          percent: Math.round((totalLoaded / file.size) * 100),
          loaded: Math.round(totalLoaded),
          total: file.size,
        })
      }
    : null

  // 2. Грузим чанки батчами по CHUNK_CONCURRENCY параллельно
  const uploadChunk = (index: number): Promise<void> => {
    const start = index * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunkBlob = file.slice(start, end)
    const chunkBytes = end - start

    const formData = new FormData()
    formData.append('file', new File([chunkBlob], `chunk-${index}`))
    formData.append('uploadId', uploadId)
    formData.append('chunkIndex', String(index))

    return xhrUpload<void>(
      'POST',
      `${baseURL}/datasets/upload/chunked/chunk`,
      formData,
      reportProgress
        ? (e) => {
            loadedBytes[index] = (e.loaded / e.total) * chunkBytes
            reportProgress()
          }
        : undefined,
    )
  }

  for (let i = 0; i < totalChunks; i += CHUNK_CONCURRENCY) {
    const batchSize = Math.min(CHUNK_CONCURRENCY, totalChunks - i)
    await Promise.all(
      Array.from({ length: batchSize }, (_, k) => uploadChunk(i + k)),
    )
  }

  // Репортим 100% на сетевой части перед финализацией сервером
  onProgress?.({ percent: 100, loaded: file.size, total: file.size })

  // 3. Финализируем — сервер собирает чанки и извлекает ZIP
  const qs = overwrite ? '' : '?overwrite=false'
  const token2 = getToken() // токен мог обновиться
  const completeRes = await fetch(`${baseURL}/datasets/upload/chunked/complete${qs}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
    },
    body: JSON.stringify({ uploadId, name, totalChunks }),
  })

  if (!completeRes.ok) {
    let msg = `Chunked complete failed: HTTP ${completeRes.status}`
    try { const b = await completeRes.json() as { message?: string }; if (b.message) msg = b.message } catch {}
    throw new Error(msg)
  }

  return completeRes.json() as Promise<UploadDatasetResponse>
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

  /**
   * Загрузка ZIP-архива.
   * Файлы >= CHUNK_THRESHOLD (10 MB) автоматически идут через chunked upload:
   *   - разбивка на чанки по 5 MB
   *   - 4 чанка параллельно
   *   - progress отражает реальный прогресс передачи
   *
   * Файлы < 10 MB — одним запросом как раньше.
   */
  uploadZip: (
    name: string,
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
    overwrite = true,
  ): Promise<UploadDatasetResponse> => {
    // Крупные файлы — chunked parallel upload
    if (file.size >= CHUNK_THRESHOLD) {
      return uploadZipChunked(name, file, onProgress, overwrite)
    }

    // Мелкие файлы — простой единый запрос
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

  deleteCaption: async (
    datasetName: string,
    imageName: string,
  ): Promise<{ deleted: boolean }> => {
    const { data } = await apiClient.delete<{ deleted: boolean }>(
      `/datasets/${encodeURIComponent(datasetName)}/captions/${encodeURIComponent(imageName)}`,
    )
    return data
  },

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

  getImageUrl: (datasetName: string, filename: string): string =>
    `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`,

  getExportUrl: (datasetName: string): string =>
    `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/export`,
}