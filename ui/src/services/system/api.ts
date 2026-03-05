import { apiClient } from '@services/client'
import type { SystemSnapshot } from './types'

export const systemApi = {
  /**
   * GET /system
   * Returns the last cached snapshot (collected every 5s by the server).
   * Fast — no GPU polling on request, just returns latest cached value.
   */
  getSnapshot: async (): Promise<SystemSnapshot> => {
    const { data } = await apiClient.get<SystemSnapshot>('/system')
    return data
  },

  /**
   * POST /system/refresh
   * Forces an immediate re-poll of nvidia-smi + disk.
   * Use sparingly — normal UI should rely on getSnapshot polling.
   */
  refresh: async (): Promise<SystemSnapshot> => {
    const { data } = await apiClient.post<SystemSnapshot>('/system/refresh')
    return data
  },
}