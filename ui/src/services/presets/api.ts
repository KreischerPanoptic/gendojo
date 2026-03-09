import { apiClient } from '@services/client'
import type { ModelArchitecture } from '@services/models'
import type {
  CreatePresetDto,
  PresetsGrouped,
  PresetTier,
  TrainingPreset,
  UpdatePresetDto,
} from './types'

export const presetsApi = {
  /**
   * GET /presets
   * GET /presets?arch=flux
   * GET /presets?arch=flux&tier=balanced
   * GET /presets?source=user
   */
  list: async (params?: {
    arch?: ModelArchitecture
    tier?: PresetTier
    source?: 'system' | 'user'
  }): Promise<TrainingPreset[]> => {
    const { data } = await apiClient.get<{ presets: TrainingPreset[] }>('/presets', { params })
    return data.presets
  },

  /**
   * GET /presets/grouped
   * GET /presets/grouped?arch=flux
   */
  grouped: async (arch?: ModelArchitecture): Promise<PresetsGrouped> => {
    const { data } = await apiClient.get<{ grouped: PresetsGrouped }>(
      '/presets/grouped',
      arch ? { params: { arch } } : undefined,
    )
    return data.grouped
  },

  /** GET /presets/:id */
  getOne: async (id: string): Promise<TrainingPreset> => {
    const { data } = await apiClient.get<TrainingPreset>(`/presets/${id}`)
    return data
  },

  /** POST /presets → 201 */
  create: async (dto: CreatePresetDto): Promise<TrainingPreset> => {
    const { data } = await apiClient.post<TrainingPreset>('/presets', dto)
    return data
  },

  /** PUT /presets/:id → 200. Returns 422 for system presets. */
  update: async (id: string, dto: UpdatePresetDto): Promise<TrainingPreset> => {
    const { data } = await apiClient.put<TrainingPreset>(`/presets/${id}`, dto)
    return data
  },

  /** DELETE /presets/:id → 204. Returns 422 for system presets. */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/presets/${id}`)
  },
}