import { useQuery } from '@tanstack/react-query'
import { datasetsApi } from './api'
import { datasetsQueryKeys } from './keys'

export const useDatasets = () =>
  useQuery({
    queryKey: datasetsQueryKeys.all,
    queryFn: () => datasetsApi.list(),
    refetchInterval: 60_000,
    staleTime: 55_500,
    throwOnError: false,
  })

export const useDataset = (name: string) =>
  useQuery({
    queryKey: datasetsQueryKeys.detail(name),
    queryFn: () => datasetsApi.getOne(name),
    refetchInterval: 35_000,
    staleTime: 30_500,
    throwOnError: false,
  })

/**
 * Fetch caption text + stats for a single image.
 * enabled=false when no image is selected yet.
 * Returns { caption: string | null, captionStats: CaptionStats | null }.
 */
export const useCaption = (datasetName: string, imageName: string, enabled = true) =>
  useQuery({
    queryKey: datasetsQueryKeys.caption(datasetName, imageName),
    queryFn: () => datasetsApi.getCaption(datasetName, imageName),
    enabled: enabled && !!datasetName && !!imageName,
    staleTime: 60_000,
    throwOnError: false,
  })

/**
 * Fetch dataset.meta.json.
 * Separate query from detail so the view page can update meta
 * without re-fetching the full image list.
 */
export const useDatasetMeta = (datasetName: string) =>
  useQuery({
    queryKey: datasetsQueryKeys.meta(datasetName),
    queryFn: () => datasetsApi.getMeta(datasetName),
    staleTime: 30_000,
    throwOnError: false,
  })