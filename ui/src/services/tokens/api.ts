import { tokensControllerClear, tokensControllerGet, tokensControllerUpdate } from '@api/sdk.gen'
import type { TokensResponse, UpdateTokens } from './types'
import type { TokensControllerClearData } from '@api/types.gen'

export const tokensApi = {
  get: (): Promise<TokensResponse> =>
    tokensControllerGet().then(r => {
      if (!r.data) throw new Error(`Can't get tokens.`)
      return r.data
    }),

  update: (body: UpdateTokens): Promise<TokensResponse> =>
    tokensControllerUpdate({ body }).then(r => {
      if (!r.data) throw new Error(`Can't update tokens.`)
      return r.data
    }),

  clear: async (key: TokensControllerClearData['path']['key']): Promise<TokensResponse> =>
    tokensControllerClear({ path: { key } }).then(r => {
      if (!r.data) throw new Error(`Can't clear tokens.`)
      return r.data
    }),
}