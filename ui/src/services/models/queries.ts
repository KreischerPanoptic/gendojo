import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { modelsApi } from './api'
import { modelsQueryKeys } from './keys'
import type { ModelArchitecture, ModelsListParams } from './types'

// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fast file-presence check for an architecture.
 * Does NOT compute hashes — safe to run on mount.
 * Refetches whenever the models list is invalidated.
 */
export const useArchReadiness = (arch: ModelArchitecture) => {
  return useQuery({
    queryKey: modelsQueryKeys.readiness(arch),
    queryFn: () => modelsApi.checkArchReadiness(arch),
    // Don't auto-poll — revalidate when models list changes
    staleTime: Infinity,
    throwOnError: false,
    enabled: arch !== 'unknown',
  })
}