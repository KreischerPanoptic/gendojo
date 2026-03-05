import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from './api'
import type { UploadProgressEvent } from './types'
import { datasetsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────
// Shared upload state type
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDatasetState {
  progress: number
  isUploading: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload ZIP archive
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

      return datasetsApi.uploadZip(name, file, (event: UploadProgressEvent) => {
        setUploadState({ progress: event.percent, isUploading: true })
      })
    },

    onSuccess: () => {
      setUploadState({ progress: 100, isUploading: false })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },

    onError: (error) => {
      setUploadState({ progress: 0, isUploading: false })
      console.error('[Datasets] ZIP upload failed:', error)
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

      return datasetsApi.uploadFiles(name, files, (event: UploadProgressEvent) => {
        setUploadState({ progress: event.percent, isUploading: true })
      })
    },

    onSuccess: () => {
      setUploadState({ progress: 100, isUploading: false })
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },

    onError: (error) => {
      setUploadState({ progress: 0, isUploading: false })
      console.error('[Datasets] Files upload failed:', error)
    },
  })

  return {
    ...mutation,
    uploadState,
    resetProgress: () => setUploadState({ progress: 0, isUploading: false }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert caption for a single image
// ─────────────────────────────────────────────────────────────────────────────

export const useUpsertCaption = (datasetName: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ imageName, caption }: { imageName: string; caption: string }) =>
      datasetsApi.upsertCaption(datasetName, imageName, caption),

    onSuccess: (_data, { imageName }) => {
      // Invalidate the caption cache for this specific image
      void queryClient.invalidateQueries({
        queryKey: datasetsQueryKeys.caption(datasetName, imageName),
      })
      // Refresh dataset detail so hasCaption flags update
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.detail(datasetName) })
    },

    onError: (error) => {
      console.error('[Datasets] Caption save failed:', error)
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

    onError: (error) => {
      console.error('[Datasets] Delete failed:', error)
    },
  })
}