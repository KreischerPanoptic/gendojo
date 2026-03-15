/**
 * Datasets API service
 *
 * Split into two sections:
 *
 *  1. REST calls via generated SDK (datasetsController* functions)
 *     — fully typed, no boilerplate, errors handled uniformly
 *
 *  2. XHR-based uploads — must use XMLHttpRequest because the Fetch API
 *     and axios do not expose upload progress (onprogress) in a standard way.
 *     The chunked upload path is also here: files >= CHUNK_THRESHOLD are
 *     automatically split into parallel 5 MB chunks.
 *
 *  3. URL builders — for <img src> and <a href> (SkipAuth endpoints)
 */

import {
  datasetsControllerList,
  datasetsControllerGetOne,
  datasetsControllerGetCaption,
  datasetsControllerUpsertCaption,
  datasetsControllerDeleteCaption,
  datasetsControllerPrependToken,
  datasetsControllerGetMeta,
  datasetsControllerUpdateMeta,
  datasetsControllerDetectCaptionType,
  datasetsControllerDeleteImage,
  datasetsControllerRemove,
  datasetsControllerInitChunkedUpload,
  datasetsControllerCompleteChunkedUpload,
} from '@api/sdk.gen'

import type {
  DatasetSummary,
  DatasetDetail,
  DatasetMeta,
  DatasetMetaUpdate,
  UploadDatasetResponse,
  GetCaptionResponse,
  UpsertCaptionResponse,
  DeleteCaptionResponse,
  PrependTokenResult,
  CaptionTypeDetectionResult,
  DeleteImageResponse,
  DeleteDatasetResponse,
  ReplaceImageResponse,
  PrependMode,
  UploadProgressEvent,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Shared XHR helpers
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
 * Generic XHR multipart upload with optional progress tracking.
 *
 * We use XHR here — not axios and not fetch — because:
 *   - axios wraps XHR but doesn't expose upload.onprogress from the outside
 *   - fetch has no upload progress API at all (ReadableRequest body doesn't expose it)
 *   - XHR's upload.onprogress is the only reliable cross-browser way
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
            loaded:  e.loaded,
            total:   e.total,
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
        } catch { /* use default message */ }
        reject(new Error(message))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.send(formData)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunked upload (internal)
// ─────────────────────────────────────────────────────────────────────────────

/** Files >= this threshold use the chunked upload path automatically */
const CHUNK_THRESHOLD   = 10 * 1024 * 1024   // 10 MB
/** Each chunk is 5 MB */
const CHUNK_SIZE        = 5  * 1024 * 1024   // 5 MB
/** Upload N chunks in parallel */
const CHUNK_CONCURRENCY = 4

async function uploadZipChunked(
  name: string,
  file: File,
  onProgress?: (event: UploadProgressEvent) => void,
  overwrite = true,
): Promise<UploadDatasetResponse> {
  const baseURL = getBaseURL()

  // 1. Init session via SDK (no body needed, just auth)
  const { uploadId } = await datasetsControllerInitChunkedUpload()
    .then(r => {
      if (!r.data) throw new Error('Chunked init failed: no response data')
      return r.data
    })

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  // Track per-chunk bytes for aggregate progress reporting
  const loadedBytes = new Array<number>(totalChunks).fill(0)

  const reportProgress = onProgress
    ? () => {
        const totalLoaded = loadedBytes.reduce((s, v) => s + v, 0)
        onProgress({
          percent: Math.round((totalLoaded / file.size) * 100),
          loaded:  Math.round(totalLoaded),
          total:   file.size,
        })
      }
    : null

  // 2. Upload chunks in batches of CHUNK_CONCURRENCY
  const uploadChunk = (index: number): Promise<void> => {
    const start      = index * CHUNK_SIZE
    const end        = Math.min(start + CHUNK_SIZE, file.size)
    const chunkBytes = end - start

    const formData = new FormData()
    formData.append('file',       new File([file.slice(start, end)], `chunk-${index}`))
    formData.append('uploadId',   uploadId)
    formData.append('chunkIndex', String(index))

    return xhrUpload<void>(
      'POST',
      `${baseURL}/datasets/upload/chunked/chunk`,
      formData,
      reportProgress
        ? (e) => { loadedBytes[index] = (e.loaded / e.total) * chunkBytes; reportProgress() }
        : undefined,
    )
  }

  for (let i = 0; i < totalChunks; i += CHUNK_CONCURRENCY) {
    const batchEnd = Math.min(i + CHUNK_CONCURRENCY, totalChunks)
    await Promise.all(
      Array.from({ length: batchEnd - i }, (_, k) => uploadChunk(i + k)),
    )
  }

  // Report 100% on the network part before server-side assembly
  onProgress?.({ percent: 100, loaded: file.size, total: file.size })

  // 3. Finalise via SDK
  const result = await datasetsControllerCompleteChunkedUpload({
    query: { overwrite: overwrite},
    body:  { uploadId, name, totalChunks },
  })
  if (!result.data) throw new Error('Chunked complete failed: no response data')
  return result.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const datasetsApi = {

  // ── List / detail (generated SDK) ────────────────────────────────────────

  list: (): Promise<DatasetSummary[]> =>
    datasetsControllerList().then(r => r.data ?? []),

  getOne: (name: string): Promise<DatasetDetail> =>
    datasetsControllerGetOne({ path: { name } })
      .then(r => {
        if (!r.data) throw new Error(`Dataset not found: ${name}`)
        return r.data
      }),

  // ── Captions (generated SDK) ──────────────────────────────────────────────

  getCaption: (datasetName: string, imageName: string): Promise<GetCaptionResponse> =>
    datasetsControllerGetCaption({ path: { name: datasetName, image: imageName } })
      .then(r => r.data ?? { caption: null, captionStats: null }),

  upsertCaption: (
    datasetName: string,
    imageName: string,
    caption: string,
  ): Promise<UpsertCaptionResponse> =>
    datasetsControllerUpsertCaption({
      path: { name: datasetName, image: imageName },
      body: { caption },
    }).then(r => {
      if (!r.data) throw new Error('Upsert caption failed')
      return r.data
    }),

  deleteCaption: (datasetName: string, imageName: string): Promise<DeleteCaptionResponse> =>
    datasetsControllerDeleteCaption({ path: { name: datasetName, image: imageName } })
      .then(r => r.data ?? { deleted: false }),

  prependToken: (
    datasetName: string,
    token: string,
    mode: PrependMode,
    skipExisting: boolean,
  ): Promise<PrependTokenResult> =>
    datasetsControllerPrependToken({
      path: { name: datasetName },
      body: { token, mode, skipExisting },
    }).then(r => {
      if (!r.data) throw new Error('Prepend token failed')
      return r.data
    }),

  // ── Metadata (generated SDK) ──────────────────────────────────────────────

  getMeta: (datasetName: string): Promise<DatasetMeta | null> =>
    datasetsControllerGetMeta({ path: { name: datasetName } })
      .then(r => r.data ?? null),

  updateMeta: (datasetName: string, update: DatasetMetaUpdate): Promise<DatasetMeta> =>
    datasetsControllerUpdateMeta({
      path: { name: datasetName },
      body: update,
    }).then(r => {
      if (!r.data) throw new Error('Update meta failed')
      return r.data
    }),

  detectCaptionType: (datasetName: string): Promise<CaptionTypeDetectionResult> =>
    datasetsControllerDetectCaptionType({ path: { name: datasetName } })
      .then(r => {
        if (!r.data) throw new Error('Caption type detection failed')
        return r.data
      }),

  // ── Delete (generated SDK) ────────────────────────────────────────────────

  deleteImage: (datasetName: string, filename: string): Promise<DeleteImageResponse> =>
    datasetsControllerDeleteImage({ path: { name: datasetName, filename } })
      .then(r => {
        if (!r.data) throw new Error(`Delete image failed: ${filename}`)
        return r.data
      }),

  remove: (name: string): Promise<DeleteDatasetResponse> =>
    datasetsControllerRemove({ path: { name } })
      .then(r => {
        if (!r.data) throw new Error(`Remove dataset failed: ${name}`)
        return r.data
      }),

  // ── Uploads (XHR — progress tracking required) ───────────────────────────

  /**
   * Upload a ZIP archive.
   *
   * Files >= 10 MB are automatically split into 5 MB chunks and uploaded
   * 4 at a time in parallel (chunked upload path).
   * Files < 10 MB use a single POST request.
   *
   * onProgress reports aggregate bytes across all chunks.
   */
  uploadZip: (
    name: string,
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
    overwrite = true,
  ): Promise<UploadDatasetResponse> => {
    if (file.size >= CHUNK_THRESHOLD) {
      return uploadZipChunked(name, file, onProgress, overwrite)
    }

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

  /**
   * Upload individual image/caption files to an existing dataset.
   *
   * All files are uploaded in parallel. Progress is aggregated across all files.
   * Returns the response from the last completed upload.
   */
  uploadFiles: (
    name: string,
    files: File[],
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<UploadDatasetResponse> => {
    const loadedMap  = new Map<number, number>()
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
              loaded:  Math.round(totalLoaded),
              total:   totalBytes,
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

    return Promise.all(files.map((f, i) => uploadOne(f, i)))
      .then(results => results[results.length - 1]!)
  },

  /**
   * Replace an existing image in-place. Caption file is preserved.
   * Extension of the uploaded file must match the target filename.
   */
  replaceImage: (
    datasetName: string,
    filename: string,
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<ReplaceImageResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    return xhrUpload<ReplaceImageResponse>(
      'PUT',
      `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`,
      formData,
      onProgress,
    )
  },

  // ── URL builders (@SkipAuth endpoints) ───────────────────────────────────

  /**
   * Direct URL for an image — safe to use in <img src>.
   * The endpoint has @SkipAuth so no Authorization header is needed.
   */
  getImageUrl: (datasetName: string, filename: string): string =>
    `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/images/${encodeURIComponent(filename)}`,

  /**
   * Direct URL to download the entire dataset as a zip archive.
   * The endpoint has @SkipAuth so no Authorization header is needed.
   */
  getExportUrl: (datasetName: string): string =>
    `${getBaseURL()}/datasets/${encodeURIComponent(datasetName)}/export`,
}