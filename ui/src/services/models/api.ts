import { apiClient } from '@services/client'
import type {
  ArchReadinessResult,
  DeleteArchPreview,
  DeleteArchResult,
  DeleteModelResult,
  FileIntegrityResult,
  ModelArchitecture,
  ModelFile,
  ModelRole,
  ModelType,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────

export interface ModelsListParams {
  arch?: ModelArchitecture
  type?: ModelType
  role?: ModelRole
}

export const modelsApi = {
  list: async (params?: ModelsListParams): Promise<ModelFile[]> => {
    const { data } = await apiClient.get<ModelFile[]>('/models', { params })
    return data
  },

  getOne: async (id: string): Promise<ModelFile> => {
    const { data } = await apiClient.get<ModelFile>(`/models/${encodeURIComponent(id)}`)
    return data
  },

  refresh: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.post<{ count: number }>('/models/refresh')
    return data
  },

  // ── Delete ────────────────────────────────────────────────────────────────

  /**
   * DELETE /models/:id  (id is the URL-encoded relative path)
   * Returns deleted file + any shared-arch warnings.
   */
  deleteOne: async (id: string): Promise<DeleteModelResult> => {
    const { data } = await apiClient.delete<DeleteModelResult>(
      `/models/${encodeURIComponent(id)}`,
    )
    return data
  },

  /**
   * GET /models/arch/:arch/delete-preview
   * Dry-run — call before deleteArch to show the confirmation dialog.
   */
  previewDeleteArch: async (arch: ModelArchitecture): Promise<DeleteArchPreview> => {
    const { data } = await apiClient.get<DeleteArchPreview>(
      `/models/arch/${arch}/delete-preview`,
    )
    return data
  },

  /**
   * DELETE /models/arch/:arch
   * Deletes all files for the architecture. No undo.
   */
  deleteArch: async (arch: ModelArchitecture): Promise<DeleteArchResult> => {
    const { data } = await apiClient.delete<DeleteArchResult>(`/models/arch/${arch}`)
    return data
  },

  // ── Integrity ─────────────────────────────────────────────────────────────

  /**
   * GET /models/integrity?id=...
   * Compute SHA-256 and compare against the registry.
   * Can take several minutes for large files (e.g. FLUX DiT ~24 GB).
   */
  checkFileIntegrity: async (id: string): Promise<FileIntegrityResult> => {
    const { data } = await apiClient.get<FileIntegrityResult>('/models/integrity', {
      params: { id },
      // Large models can take minutes — disable default timeout
      timeout: 0,
    })
    return data
  },

  /**
   * GET /models/arch/:arch/readiness
   * Fast presence check — no hashing.
   */
  checkArchReadiness: async (arch: ModelArchitecture): Promise<ArchReadinessResult> => {
    const { data } = await apiClient.get<ArchReadinessResult>(
      `/models/arch/${arch}/readiness`,
    )
    return data
  },
}