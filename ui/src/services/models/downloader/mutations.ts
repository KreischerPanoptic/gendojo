import { useMutation, useQueryClient } from '@tanstack/react-query'
import { downloaderApi } from './api'
import { downloaderQueryKeys } from './keys'
import type { StartDownloadDto } from '@api/types.gen'

// ─────────────────────────────────────────────────────────────────────────────

export const useStartDownload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: StartDownloadDto) => downloaderApi.start(body),

    onSuccess: () => {
      // Immediately refetch jobs so the new entry appears
      void queryClient.invalidateQueries({ queryKey: downloaderQueryKeys.jobs })
    },

    onError: (error) => {
      console.error('[Downloader] Start failed:', error)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export const useCancelDownload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => downloaderApi.cancel(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloaderQueryKeys.jobs })
    },

    onError: (error) => {
      console.error('[Downloader] Cancel failed:', error)
    },
  })
}