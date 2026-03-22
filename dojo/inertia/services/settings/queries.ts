import { useQuery } from '@tanstack/react-query'
import { settingsQueryKeys } from './keys'
import { client } from '~/client'
import type { TokenType } from '#contracts/enums'
import type { Theme } from '~/stores/theme.store'

// ─────────────────────────────────────────────────────────────────────────────

export const useTheme = (initialData?: Theme) => {
  return useQuery({
    queryKey: settingsQueryKeys.theme,
    queryFn: async () => {
      return await client.api.settings.theme({})
    },
    initialData,
    staleTime: Infinity, // theme don't change in the background
    throwOnError: false,
  })
}

export const useTokens = () => {
  return useQuery({
    queryKey: settingsQueryKeys.tokens,
    queryFn: async () => {
      return await client.api.settings.tokens({})
    },
    staleTime: Infinity, // tokens don't change in the background
    throwOnError: false,
  })
}

export const useToken = (type: TokenType) => {
  return useQuery({
    queryKey: settingsQueryKeys.token(type),
    queryFn: async () => {
      return await client.api.settings.token({ params: { type } })
    },
    staleTime: Infinity, // token don't change in the background
    throwOnError: false,
  })
}

export const usePaths = () => {
  return useQuery({
    queryKey: settingsQueryKeys.paths,
    queryFn: async () => {
      return await client.api.settings.paths({})
    },
    staleTime: Infinity, // tokens don't change in the background
    throwOnError: false,
  })
}

export const useTraining = () => {
  return useQuery({
    queryKey: settingsQueryKeys.training,
    queryFn: async () => {
      return await client.api.settings.training({})
    },
    staleTime: Infinity, // tokens don't change in the background
    throwOnError: false,
  })
}
