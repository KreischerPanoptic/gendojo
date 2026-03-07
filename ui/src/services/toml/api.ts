import { apiClient } from '@services/client'
import type { TrainConfig, FullDatasetDto } from '@services/jobs'
import type {
  TomlPreviewDatasetResponse,
  TomlPreviewTrainResponse,
  TomlValidationResult,
} from './types'

export const tomlApi = {
  /**
   * POST /toml/preview/dataset
   * Generate dataset.toml string from a DatasetTomlDto.
   * Returns { toml: string }.
   */
  previewDataset: async (dto: FullDatasetDto): Promise<TomlPreviewDatasetResponse> => {
    const { data } = await apiClient.post<TomlPreviewDatasetResponse>(
      '/toml/preview/dataset',
      dto,
    )
    return data
  },

  /**
   * POST /toml/preview/train
   * Validate + generate train.toml string.
   * Returns 422 on validation failure (displayed in preview pane, not thrown).
   */
  previewTrain: async (dto: TrainConfig): Promise<TomlPreviewTrainResponse> => {
    const { data } = await apiClient.post<TomlPreviewTrainResponse>(
      '/toml/preview/train',
      dto,
    )
    return data
  },

  /**
   * POST /toml/validate/train
   * Validate only — no TOML generated.
   * Always returns 200; check `valid` field.
   */
  validateTrain: async (dto: TrainConfig): Promise<TomlValidationResult> => {
    const { data } = await apiClient.post<TomlValidationResult>(
      '/toml/validate/train',
      dto,
    )
    return data
  },
}