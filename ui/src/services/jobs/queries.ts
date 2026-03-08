import { useQuery } from '@tanstack/react-query'
import { jobsApi } from './api'
import { jobsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polls GET /jobs every 3s.
 * Jobs change frequently (status transitions, new jobs) so we poll aggressively.
 */
export const useJobs = () => {
  return useQuery({
    queryKey: jobsQueryKeys.all,
    queryFn: () => jobsApi.list(),
    refetchInterval: 3_000,
    staleTime: 2_500,
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a single job with full detail (including log buffer).
 * Polls every 3s while job is pending/running, stops when done/failed/killed.
 */
export const useJob = (id: string, enabled = true) => {
  return useQuery({
    queryKey: jobsQueryKeys.detail(id),
    queryFn: () => jobsApi.getOne(id),
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'done' || status === 'failed' || status === 'killed') return false
      return 3_000
    },
    staleTime: 2_500,
    throwOnError: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches only the log buffer for a job — lighter than useJob.
 * Use as HTTP fallback when WebSocket is unavailable.
 */
export const useJobLogs = (id: string, enabled = true) => {
  return useQuery({
    queryKey: jobsQueryKeys.logs(id),
    queryFn: () => jobsApi.getLogs(id),
    enabled: enabled && !!id,
    refetchInterval: 2_000,
    staleTime: 1_500,
    throwOnError: false,
  })
}