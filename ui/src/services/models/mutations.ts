import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { modelsApi } from './api'
import { modelsQueryKeys } from './keys'
import type { ModelArchitecture } from './types'

// ─────────────────────────────────────────────────────────────────────────────

export const useDeleteModel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => modelsApi.deleteOne(id),

    onSuccess: (result,) => {
      void queryClient.invalidateQueries({ queryKey: modelsQueryKeys.all })
      // Invalidate readiness for all arches — a deletion changes readiness
      void queryClient.invalidateQueries({ queryKey: ['models', 'readiness'] })

      if (result.sharedWarnings.length > 0) {
        const arches = result.sharedWarnings
          .flatMap((w) => w.sharedWithArches)
          .filter((a, i, arr) => arr.indexOf(a) === i)
          .join(', ')

        notifications.show({
          color: 'orange',
          title: 'Shared file deleted',
          message: `This file was also used by: ${arches}. Readiness for those architectures may be affected.`,
          autoClose: 8_000,
        })
      }
    },

    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Delete failed',
        message: (error as Error).message,
        autoClose: 5_000,
      })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export const useDeleteArch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (arch: ModelArchitecture) => modelsApi.deleteArch(arch),

    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: modelsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['models', 'readiness'] })

      notifications.show({
        color: 'teal',
        title: 'Architecture deleted',
        message: `Removed ${result.deletedCount} file${result.deletedCount !== 1 ? 's' : ''} for ${result.arch}.`,
        autoClose: 4_000,
      })
    },

    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Delete failed',
        message: (error as Error).message,
        autoClose: 5_000,
      })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash and compare against registry.
 * Returns result via onSuccess — store in local component state.
 *
 * ⚠ Large files (FLUX DiT ~24 GB) can take several minutes.
 */
export const useCheckFileIntegrity = () => {
  return useMutation({
    mutationFn: (id: string) => modelsApi.checkFileIntegrity(id),

    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Integrity check failed',
        message: (error as Error).message,
        autoClose: 5_000,
      })
    },
  })
}