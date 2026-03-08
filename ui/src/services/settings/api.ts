import { apiClient } from '@services/client'
import type { AppSettings, PathsInfo, UpdateSettingsDto } from './types'

export const settingsApi = {
  /**
   * GET /settings
   * Full settings object (paths + training constants).
   */
  get: async (): Promise<AppSettings> => {
    const { data } = await apiClient.get<AppSettings>('/settings')
    return data
  },

  /**
   * GET /settings/paths
   * Resolved absolute paths for all workspace volumes including
   * static paths (accelerateConfig, temp) not editable via UI.
   */
  getPaths: async (): Promise<PathsInfo> => {
    const { data } = await apiClient.get<PathsInfo>('/settings/paths')
    return data
  },

  /**
   * PUT /settings
   * Partial update — only provided fields are changed.
   */
  update: async (dto: UpdateSettingsDto): Promise<AppSettings> => {
    const { data } = await apiClient.put<AppSettings>('/settings', dto)
    return data
  },
}