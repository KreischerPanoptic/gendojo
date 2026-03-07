import { useQuery } from '@tanstack/react-query'
import type { TrainConfig, FullDatasetDto } from '@services/jobs'
import { tomlApi } from './api'
import { tomlQueryKeys } from './keys'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Live train TOML preview.
 *
 * - Query key contains the full dto, so a cache hit is returned when the
 *   debounced form hasn't changed (same config → same TOML, staleTime=Infinity).
 * - retry=false: 422 validation errors are shown in the preview pane, not retried.
 * - throwOnError=false: the error is available via `error`, not thrown.
 *
 * Usage:
 *   const debouncedDto = useDebounced(buildTrainConfig(form), 400)
 *   const { data, error, isFetching } = useTrainTomlPreview(debouncedDto)
 */
export const useTrainTomlPreview = (dto: TrainConfig | null) =>
  useQuery({
    queryKey: tomlQueryKeys.trainPreview(dto),
    queryFn:  () => tomlApi.previewTrain(dto!),
    // Only fire when the minimum required fields are present.
    // Missing arch-specific required fields (e.g. clip_l for FLUX) will
    // return a 422 from the backend which is shown as an error in the UI.
    enabled:      !!dto?.output_name && !!dto?.arch && !!dto?.pretrained_model_name_or_path,
    staleTime:    Infinity,
    gcTime:       5 * 60 * 1000,
    retry:        false,
    throwOnError: false,
  })

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Live dataset TOML preview.
 * Enabled when at least one dataset with a non-empty image_dir is provided.
 */
export const useDatasetTomlPreview = (dto: FullDatasetDto | null) =>
  useQuery({
    queryKey: tomlQueryKeys.datasetPreview(dto),
    queryFn:  () => tomlApi.previewDataset(dto!),
    enabled:  !!dto?.datasets?.[0]?.subsets?.[0]?.image_dir,
    staleTime:    Infinity,
    gcTime:       5 * 60 * 1000,
    retry:        false,
    throwOnError: false,
  })

// ─────────────────────────────────────────────────────────────────────────────

/**
 * On-demand validation (result available without 422 semantics).
 * Pass enabled=false and call refetch() to trigger imperatively.
 */
export const useValidateTrain = (dto: TrainConfig | null, enabled = false) =>
  useQuery({
    queryKey: tomlQueryKeys.trainValidate(dto),
    queryFn:  () => tomlApi.validateTrain(dto!),
    enabled:  enabled && !!dto,
    staleTime:    0,
    retry:        false,
    throwOnError: false,
  })