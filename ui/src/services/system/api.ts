import { systemControllerGetSnapshot, systemControllerRefresh } from '@api/sdk.gen'
import type { SystemSnapshot } from './types'

export const systemApi = {
  getSnapshot: (): Promise<SystemSnapshot> =>
    systemControllerGetSnapshot().then(r => {
      if (!r.data) throw new Error(`Can't get system statistics.`)
      return r.data
    }),

  refresh: (): Promise<SystemSnapshot> =>
    systemControllerRefresh().then(r => {
      if (!r.data) throw new Error(`Can't refresh system statistics.`)
      return r.data
    }),
}