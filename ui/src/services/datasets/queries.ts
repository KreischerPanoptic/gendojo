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
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch caption text for a single image.
// enabled=false when no image is selected yet.
// Returns { caption: string | null } — null means no .txt file exists.
// ─────────────────────────────────────────────────────────────────────────────

export const useCaption = (datasetName: string, imageName: string, enabled = true) => {
  return useQuery({
    queryKey: datasetsQueryKeys.caption(datasetName, imageName),
    queryFn: () => datasetsApi.getCaption(datasetName, imageName),
    enabled: enabled && !!datasetName && !!imageName,
    // Captions change only when the user saves — no need to poll
    staleTime: 60_000,
    throwOnError: false,
  })
}