import { useQuery } from '@tanstack/react-query'
import { settingsApi } from './api'
import { settingsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full settings (paths + training constants).
 * Fetched once on mount; no polling — settings change only when the user
 * explicitly saves them via the Settings page.
 */
export const useSettings = () => {
  return useQuery({
    queryKey: settingsQueryKeys.all,
    queryFn:  () => settingsApi.get(),
    staleTime: Infinity,  // settings don't change in the background
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolved workspace paths including static paths (accelerateConfig, temp).
 *
 * Primary use case: NewJobPage needs `outputs` to build the default
 * output_dir and `datasets` for the image_dir preview in dataset.toml.
 *
 * Fetched once; same staleTime: Infinity policy as useSettings.
 */
export const usePaths = () => {
  return useQuery({
    queryKey: settingsQueryKeys.paths,
    queryFn:  () => settingsApi.getPaths(),
    staleTime: Infinity,
    throwOnError: false,
  })
}