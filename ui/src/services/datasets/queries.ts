import { useQuery } from '@tanstack/react-query'
import { datasetsApi } from './api'
import { datasetsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────

export const useDatasets = () => {
  return useQuery({
    queryKey: datasetsQueryKeys.all,
    queryFn: () => datasetsApi.list(),
    refetchInterval: 5_000,
    staleTime: 4_500,
    // Don't throw on error — sidebar should degrade gracefully
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
export const useDataset = (name: string) => {
  return useQuery({
    queryKey: datasetsQueryKeys.detail(name),
    queryFn: () => datasetsApi.getOne(name),
    refetchInterval: 5_000,
    staleTime: 4_500,
    // Don't throw on error — sidebar should degrade gracefully
    throwOnError: false,
  })
}