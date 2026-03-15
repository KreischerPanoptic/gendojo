import type {
  ModelFileDto,
  RefreshResponseDto,
  DeleteModelResultDto,
  DeleteArchPreviewDto,
  DeleteArchResultDto,
  FileIntegrityResultDto,
  ArchReadinessResultDto,
  ModelsListParams,
  ModelArchitecture,
} from './types'
import { modelsControllerArchReadiness, modelsControllerDeleteArch, modelsControllerDeleteArchPreview, modelsControllerDeleteOne, modelsControllerFileIntegrity, modelsControllerGetOne, modelsControllerList, modelsControllerRefresh } from '@api/sdk.gen'

// ─────────────────────────────────────────────────────────────────────────────

export const modelsApi = {
  list: (params?: ModelsListParams): Promise<ModelFileDto | ModelFileDto[]> =>
    modelsControllerList({ query: params }).then(r => r.data ?? []),

  getOne: async (id: string): Promise<ModelFileDto> => 
    modelsControllerGetOne({ path: { 0: id } }).then(r => {
      if (!r.data) throw new Error(`Model with id ${id} not found.`)
      return r.data
    }),

  refresh: (): Promise<RefreshResponseDto> => 
    modelsControllerRefresh().then(r => r.data ?? { count: 0 }),

  deleteOne: (id: string): Promise<DeleteModelResultDto> =>
    modelsControllerDeleteOne({ path: { 0: id } }).then(r => {
      if (!r.data) throw new Error(`Model with id ${id} not found.`)
      return r.data
    }),

  previewDeleteArch: (arch: ModelArchitecture): Promise<DeleteArchPreviewDto> =>
    modelsControllerDeleteArchPreview({ path: { arch } }).then(r => {
      if (!r.data) throw new Error(`Models with arch ${arch} not found.`)
      return r.data
    }),

  deleteArch: (arch: ModelArchitecture): Promise<DeleteArchResultDto> =>
    modelsControllerDeleteArch({ path: { arch } }).then(r => {
      if (!r.data) throw new Error(`Models with arch ${arch} not found.`)
      return r.data
    }),

  checkFileIntegrity: (id: string): Promise<FileIntegrityResultDto> =>
    modelsControllerFileIntegrity({ query: { id }, timeout: 0 }).then(r => {
      if (!r.data) throw new Error(`Model with id ${id} not found.`)
      return r.data
    }),

  checkArchReadiness: (arch: ModelArchitecture): Promise<ArchReadinessResultDto> =>
    modelsControllerArchReadiness({ path: { arch } }).then(r => {
      if (!r.data) throw new Error(`Models with arch ${arch} not found.`)
      return r.data
    }),
}