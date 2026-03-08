import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from './api'
import type { UpdateSettingsDto } from './types'
import { settingsQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update settings via PUT /settings.
 * On success invalidates both the full settings cache and the paths cache
 * so any component using usePaths() gets fresh data immediately.
 */
export const useUpdateSettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: UpdateSettingsDto) => settingsApi.update(dto),

    onSuccess: (updated) => {
      // Seed the full settings cache with the response — no extra GET needed
      queryClient.setQueryData(settingsQueryKeys.all, updated)
      // Paths may have changed — invalidate so usePaths() refetches
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.paths })
    },

    onError: (error) => {
      console.error('[Settings] Update failed:', error)
    },
  })
}