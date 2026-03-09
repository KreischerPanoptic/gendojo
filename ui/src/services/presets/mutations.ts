import { useMutation, useQueryClient } from '@tanstack/react-query'
import { presetsApi } from './api'
import { presetsQueryKeys } from './keys'
import type { CreatePresetDto, TrainingPreset, UpdatePresetDto } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

export const useCreatePreset = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreatePresetDto) => presetsApi.create(dto),
    onSuccess: (created: TrainingPreset) => {
      queryClient.setQueryData(presetsQueryKeys.detail(created.id), created)
      void queryClient.invalidateQueries({ queryKey: presetsQueryKeys.all })
    },
    onError: (err) => console.error('[Presets] Create failed:', err),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

export const useUpdatePreset = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePresetDto }) =>
      presetsApi.update(id, dto),
    onSuccess: (updated: TrainingPreset) => {
      queryClient.setQueryData(presetsQueryKeys.detail(updated.id), updated)
      void queryClient.invalidateQueries({ queryKey: presetsQueryKeys.all })
    },
    onError: (err) => console.error('[Presets] Update failed:', err),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export const useDeletePreset = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => presetsApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: presetsQueryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: presetsQueryKeys.all })
    },
    onError: (err) => console.error('[Presets] Delete failed:', err),
  })
}