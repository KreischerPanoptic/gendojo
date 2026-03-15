import { useQuery } from '@tanstack/react-query'
import { downloaderApi } from './api'
import { downloaderQueryKeys } from './keys'
import type { DownloadJobDto } from '@api/types.gen'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Presets are static — no polling needed.
 */
export const useDownloaderPresets = () => {
  return useQuery({
    queryKey: downloaderQueryKeys.presets,
    queryFn: () => downloaderApi.listPresets(),
    staleTime: 10_000,
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Jobs list.
 *
 * Polls every second when any job is active (pending/downloading),
 * slows to 10s when all jobs are terminal.
 */
export const useDownloadJobs = () => {
  return useQuery({
    queryKey: downloaderQueryKeys.jobs,
    queryFn: () => downloaderApi.listJobs(),
    refetchInterval: (query) => {
      const jobs: DownloadJobDto[] = query.state.data ?? []
      const hasActive = jobs.some(
        (j) => j.status === 'pending' || j.status === 'downloading',
      )
      return hasActive ? 1_000 : 10_000
    },
    staleTime: 900,
    throwOnError: false,
  })
}