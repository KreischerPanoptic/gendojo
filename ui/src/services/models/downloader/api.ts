import type {
  DownloadJobDto,
  PresetDto,
  PresetsGroupedDto,
  StartDownloadDto,
} from './types'
import type { ModelArchitecture } from '@services/models'
import { downloaderControllerCancel, downloaderControllerGetOne, downloaderControllerList, downloaderControllerPresets, downloaderControllerStart } from '@api/sdk.gen'

// ─────────────────────────────────────────────────────────────────────────────

export const downloaderApi = {
  listPresets: (): Promise<PresetsGroupedDto | PresetDto[]> =>
    downloaderControllerPresets().then(r => r.data ?? []),

  listPresetsByArch: (arch: ModelArchitecture): Promise<PresetsGroupedDto | PresetDto[]> => 
    downloaderControllerPresets(
      {
        query: { arch: arch }
      }
    ).then(r => r.data ?? []),

  listJobs: (): Promise<DownloadJobDto[]> =>
    downloaderControllerList().then(r => r.data ?? []),

  getJob: (id: string): Promise<DownloadJobDto> => 
    downloaderControllerGetOne(
      {
        path: { id }
      }
    ).then(r => {
      if (!r.data) throw new Error(`Job with id ${id} not found.`)
      return r.data
    }),

  start: (body: StartDownloadDto): Promise<DownloadJobDto> => 
    downloaderControllerStart({ body }).then(r => {
      if (!r.data) throw new Error(`Can't start job.`)
      return r.data
    }),

  cancel: (id: string): Promise<DownloadJobDto> => 
    downloaderControllerCancel(
      {
        path: { id }
      }
    ).then(r => {
      if (!r.data) throw new Error(`Job with id ${id} not found.`)
      return r.data
    }),
}