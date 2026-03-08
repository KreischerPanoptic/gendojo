import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemApi } from './api'

// ─────────────────────────────────────────────────────────────────────────────

export const systemQueryKeys = {
  snapshot: ['system', 'snapshot'] as const,
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polls GET /system every 5 seconds.
 * The server already polls nvidia-smi on a 5s interval — we just read the cache.
 *
 * @param enabled  Pass false to pause polling (e.g. when tab is hidden)
 */
export const useSystemSnapshot = (enabled = true) => {
  return useQuery({
    queryKey: systemQueryKeys.snapshot,
    queryFn: () => systemApi.getSnapshot(),
    refetchInterval: 5_000,
    staleTime: 4_500,
    enabled,
    // Don't throw on error — sidebar should degrade gracefully
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/** Force-refresh the snapshot (e.g. on a manual "refresh" button click). */
export const useRefreshSystem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => systemApi.refresh(),
    onSuccess: (data) => {
      queryClient.setQueryData(systemQueryKeys.snapshot, data)
    },
    onError: (error) => {
      console.error('[System] Refresh failed:', error)
    },
  })
}