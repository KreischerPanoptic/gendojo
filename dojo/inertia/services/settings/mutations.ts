import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsQueryKeys } from './keys'
import { client } from '~/client'
import type { SaveToken, UpdatePaths, UpdateTheme, UpdateTraining } from './types'
import type { TokenType } from '#contracts/enums'

// ─────────────────────────────────────────────────────────────────────────────

export const useChangeTheme = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: UpdateTheme) => {
      const result = await client.api.settings.theme.change({ body: dto })
      return result
    },

    onSuccess: (updatedData) => {
      queryClient.setQueryData(settingsQueryKeys.theme, updatedData)
    },

    onError: (error) => {
      console.error('[Settings] Update failed:', error)
    },
  })
}

export const useUpdateToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: SaveToken) => {
      const result = await client.api.settings.token.save({ params: { type: dto.type }, body: dto })
      return result
    },

    onSuccess: (updatedData) => {
      queryClient.setQueryData(
        settingsQueryKeys.token(updatedData.token.type),
        updatedData.token.hint
      )
    },

    onError: (error) => {
      console.error('[Settings] Update failed:', error)
    },
  })
}

export const useDeleteToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (type: TokenType) => {
      const result = await client.api.settings.token.delete({ params: { type } })
      return result
    },

    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.token(updatedData.token.type) })
    },

    onError: (error) => {
      console.error('[Settings] Update failed:', error)
    },
  })
}

export const useUpdateTraining = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: UpdateTraining) => {
      const result = await client.api.settings.training.update({ body: dto })
      return result
    },

    onSuccess: (updatedData) => {
      queryClient.setQueryData(settingsQueryKeys.training, updatedData)
    },

    onError: (error) => {
      console.error('[Settings] Update failed:', error)
    },
  })
}

export const useUpdatePaths = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: UpdatePaths) => {
      const result = await client.api.settings.paths.update({ body: dto })
      return result
    },

    onSuccess: (updatedData) => {
      queryClient.setQueryData(settingsQueryKeys.paths, updatedData)
    },

    onError: (error) => {
      console.error('[Settings] Update failed:', error)
    },
  })
}
