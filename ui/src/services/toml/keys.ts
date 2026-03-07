import type { TrainConfig, FullDatasetDto } from '@services/jobs'

export const tomlQueryKeys = {
  /**
   * Key includes the full DTO so the query refetches whenever the config changes.
   * React Query hashes objects via JSON.stringify internally — safe to use as key.
   */
  trainPreview:   (dto: TrainConfig | null)    => ['toml', 'preview', 'train',   dto] as const,
  datasetPreview: (dto: FullDatasetDto | null) => ['toml', 'preview', 'dataset', dto] as const,
  trainValidate:  (dto: TrainConfig | null)    => ['toml', 'validate', 'train',  dto] as const,
}