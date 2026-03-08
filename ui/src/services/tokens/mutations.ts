import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tokensApi } from './api'
import type { UpdateTokensDto } from './types'
import { tokensQueryKeys } from './keys'

export const useUpdateTokens = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: UpdateTokensDto) => tokensApi.update(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(tokensQueryKeys.all, updated)
    },
    onError: (error) => {
      console.error('[Tokens] Update failed:', error)
    },
  })
}

export const useClearToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (key: 'hfToken' | 'civitaiToken') => tokensApi.clear(key),
    onSuccess: (updated) => {
      queryClient.setQueryData(tokensQueryKeys.all, updated)
    },
    onError: (error) => {
      console.error('[Tokens] Clear failed:', error)
    },
  })
}