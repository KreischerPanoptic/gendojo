import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from './api'
import type { DatasetMetaUpdate, PrependMode, UploadProgressEvent } from './types'
import { datasetsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────
// Shared upload state
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDatasetState {
  progress: number
  isUploading: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload ZIP
// ─────────────────────────────────────────────────────────────────────────────

export const useUploadDatasetZip = () => {
  const queryClient = useQueryClient()
  const [uploadState, setUploadState] = useState<UploadDatasetState>({
    progress: 0,
    isUploading: false,
  })

  const mutation = useMutation({
    mutationFn: ({ name, file }: { name: string; file: File }) => {
      setUploadState({ progress: 0, isUploading: true })
      return datasetsApi.uploadZip(name, file, (e: UploadProgressEvent) => {
        setUploadState({ progress: e.percent, isUploading: true })
      })
    },
    onSuccess: () => {
      setUploadState({ progress: 100, isUploading: false })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },
    onError: () => {
      setUploadState({ progress: 0, isUploading: false })
    },
  })

  return {
    ...mutation,
    uploadState,
    resetProgress: () => setUploadState({ progress: 0, isUploading: false }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload individual files
// ─────────────────────────────────────────────────────────────────────────────

export const useUploadDatasetFiles = () => {
  const queryClient = useQueryClient()
  const [uploadState, setUploadState] = useState<UploadDatasetState>({
    progress: 0,
    isUploading: false,
  })

  const mutation = useMutation({
    mutationFn: ({ name, files }: { name: string; files: File[] }) => {
      setUploadState({ progress: 0, isUploading: true })
      return datasetsApi.uploadFiles(name, files, (e: UploadProgressEvent) => {
        setUploadState({ progress: e.percent, isUploading: true })
      })
    },
    onSuccess: () => {
      setUploadState({ progress: 100, isUploading: false })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },
    onError: () => {
      setUploadState({ progress: 0, isUploading: false })
    },
  })

  return {
    ...mutation,
    uploadState,
    resetProgress: () => setUploadState({ progress: 0, isUploading: false }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Replace image
// ─────────────────────────────────────────────────────────────────────────────

export const useReplaceImage = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ filename, file }: { filename: string; file: File }) =>
      datasetsApi.replaceImage(datasetName, filename, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert caption
// ─────────────────────────────────────────────────────────────────────────────

export const useUpsertCaption = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ imageName, caption }: { imageName: string; caption: string }) =>
      datasetsApi.upsertCaption(datasetName, imageName, caption),
    onSuccess: (_data, { imageName }) => {
      void queryClient.invalidateQueries({
        queryKey: datasetsQueryKeys.caption(datasetName, imageName),
      })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete caption
// ─────────────────────────────────────────────────────────────────────────────

export const useDeleteCaption = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imageName: string) =>
      datasetsApi.deleteCaption(datasetName, imageName),
    onSuccess: (_data, imageName) => {
      // Remove cached caption so the next read returns null
      queryClient.removeQueries({
        queryKey: datasetsQueryKeys.caption(datasetName, imageName),
      })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete image
// ─────────────────────────────────────────────────────────────────────────────

export const useDeleteImage = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filename: string) =>
      datasetsApi.deleteImage(datasetName, filename),
    onSuccess: (_data, filename) => {
      queryClient.removeQueries({
        queryKey: datasetsQueryKeys.caption(datasetName, filename),
      })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepend token (bulk)
// ─────────────────────────────────────────────────────────────────────────────

export const usePrependToken = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      token,
      mode,
      skipExisting,
    }: {
      token: string
      mode: PrependMode
      skipExisting: boolean
    }) => datasetsApi.prependToken(datasetName, token, mode, skipExisting),
    onSuccess: () => {
      // All captions changed — invalidate detail and all caption caches for this dataset
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
      void queryClient.invalidateQueries({ queryKey: ['datasets', datasetName, 'captions'] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Update metadata
// ─────────────────────────────────────────────────────────────────────────────

export const useUpdateMeta = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: DatasetMetaUpdate) =>
      datasetsApi.updateMeta(datasetName, update),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.meta(datasetName) })
      // Also refresh list/detail so meta shows updated in summaries
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Detect caption type
// ─────────────────────────────────────────────────────────────────────────────

export const useDetectCaptionType = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => datasetsApi.detectCaptionType(datasetName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.meta(datasetName) })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete dataset
// ─────────────────────────────────────────────────────────────────────────────

export const useRemoveDataset = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => datasetsApi.remove(name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({ queryKey: datasetsQueryKeys.detail(name) })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },
  })
}