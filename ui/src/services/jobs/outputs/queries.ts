import { useQuery } from '@tanstack/react-query'
import { outputsApi } from './api'
import { outputsQueryKeys } from './keys'

/**
 * Fetches job outputs (checkpoints + sample previews).
 * Polls every 10s while job is running, stops when disabled.
 *
 * @param jobId    - Job ID
 * @param enabled  - Pass false to suspend polling (e.g. job not started yet)
 * @param interval - Poll interval in ms (default 10s)
 */
export const useJobOutputs = (
  jobId: string,
  enabled = true,
  interval = 10_000,
) => {
  return useQuery({
    queryKey: outputsQueryKeys.outputs(jobId),
    queryFn:  () => outputsApi.getOutputs(jobId),
    enabled:  enabled && !!jobId,
    refetchInterval: interval,
    staleTime: interval - 500,
    throwOnError: false,
  })
}