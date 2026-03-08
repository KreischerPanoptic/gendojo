import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { modelsApi, type ModelsListParams } from './api'
import { modelsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polls GET /models every 15s.
 * Models change only when the user downloads or manually adds files —
 * no need for aggressive polling like datasets.
 */
export const useModels = (params?: ModelsListParams) => {
  return useQuery({
    queryKey: modelsQueryKeys.all,
    queryFn: () => modelsApi.list(params),
    refetchInterval: 15_000,
    staleTime: 14_000,
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/** Force-refresh the model cache (POST /models/refresh). */
export const useRefreshModels = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => modelsApi.refresh(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelsQueryKeys.all })
    },
    onError: (error) => {
      console.error('[Models] Refresh failed:', error)
    },
  })
}