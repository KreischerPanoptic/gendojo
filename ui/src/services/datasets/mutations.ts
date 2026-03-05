import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from './api'
import type { UploadProgressEvent } from './types'
import { datasetsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────
// Upload — wraps XHR-based upload with reactive progress state
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDatasetState {
  progress: number
  isUploading: boolean
}

export const useUploadDataset = () => {
  const queryClient = useQueryClient()
  const [uploadState, setUploadState] = useState<UploadDatasetState>({
    progress: 0,
    isUploading: false,
  })

  const mutation = useMutation({
    mutationFn: (file: File) => {
      setUploadState({ progress: 0, isUploading: true })

      return datasetsApi.upload(file, (event: UploadProgressEvent) => {
        setUploadState({ progress: event.percent, isUploading: true })
      })
    },

    onSuccess: () => {
      setUploadState({ progress: 100, isUploading: false })
      // Invalidate list so the new dataset appears immediately
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },

    onError: (error) => {
      setUploadState({ progress: 0, isUploading: false })
      console.error('[Datasets] Upload failed:', error)
    },
  })

  return {
    ...mutation,
    uploadState,
    /** Reset progress after the upload card is dismissed */
    resetProgress: () => setUploadState({ progress: 0, isUploading: false }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete dataset
// ─────────────────────────────────────────────────────────────────────────────

export const useRemoveDataset = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => datasetsApi.remove(name),

    onSuccess: (_data, name) => {
      // Remove detail from cache immediately
      queryClient.removeQueries({ queryKey: datasetsQueryKeys.detail(name) })
      // Refresh list
      void queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
    },

    onError: (error) => {
      console.error('[Datasets] Delete failed:', error)
    },
  })
}