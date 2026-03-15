import { settingsControllerGetPaths, settingsControllerGetSettings, settingsControllerUpdateSettings } from '@api/sdk.gen'
import type { SettingsDto, PathsDto, UpdateSettingsDto } from './types'

export const settingsApi = {
  get: (): Promise<SettingsDto> =>
    settingsControllerGetSettings().then(r => {
      if (!r.data) throw new Error(`Can't get settings.`)
      return r.data
    }),

  getPaths: (): Promise<PathsDto> =>
    settingsControllerGetPaths().then(r => {
      if (!r.data) throw new Error(`Can't get paths.`)
      return r.data
    }),

  update: (body: UpdateSettingsDto): Promise<SettingsDto> =>
    settingsControllerUpdateSettings({ body }).then(r => {
      if (!r.data) throw new Error(`Can't update settings.`)
      return r.data
    }),
}