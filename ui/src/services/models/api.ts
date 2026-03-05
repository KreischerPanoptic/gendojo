import { apiClient } from '@services/client'
import type { ModelArchitecture, ModelFile, ModelRole, ModelType } from './types'

// ─────────────────────────────────────────────────────────────────────────────

export interface ModelsListParams {
  arch?: ModelArchitecture
  type?: ModelType
  role?: ModelRole
}

export const modelsApi = {
  /**
   * GET /models
   * Returns all model files, optionally filtered.
   */
  list: async (params?: ModelsListParams): Promise<ModelFile[]> => {
    const { data } = await apiClient.get<ModelFile[]>('/models', { params })
    return data
  },

  /**
   * GET /models/:id  (id is the URL-encoded relative path)
   */
  getOne: async (id: string): Promise<ModelFile> => {
    const { data } = await apiClient.get<ModelFile>(`/models/${encodeURIComponent(id)}`)
    return data
  },

  /**
   * POST /models/refresh
   * Re-scans the models directory and rebuilds the server cache.
   * Returns the number of models found.
   */
  refresh: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.post<{ count: number }>('/models/refresh')
    return data
  },
}