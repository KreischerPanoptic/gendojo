import { useQuery } from '@tanstack/react-query'
import { tokensApi } from './api'
import { tokensQueryKeys } from './keys'

/**
 * Fetches masked token status (set flag + hint).
 * Stale immediately — refetch whenever the settings page mounts.
 */
export const useTokens = () => {
  return useQuery({
    queryKey: tokensQueryKeys.all,
    queryFn: () => tokensApi.get(),
    staleTime: 0,
    throwOnError: false,
  })
}