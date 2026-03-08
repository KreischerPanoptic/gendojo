import { apiClient } from '@services/client'
import type { TokensResponse, UpdateTokensDto } from './types'

export const tokensApi = {
  /**
   * GET /settings/tokens
   * Returns masked token info — never raw values.
   */
  get: async (): Promise<TokensResponse> => {
    const { data } = await apiClient.get<TokensResponse>('/settings/tokens')
    return data
  },

  /**
   * PUT /settings/tokens
   * Upsert one or both tokens.
   */
  update: async (dto: UpdateTokensDto): Promise<TokensResponse> => {
    const { data } = await apiClient.put<TokensResponse>('/settings/tokens', dto)
    return data
  },

  /**
   * DELETE /settings/tokens/:key
   * Clear a specific token from persisted storage.
   */
  clear: async (key: 'hfToken' | 'civitaiToken'): Promise<TokensResponse> => {
    const { data } = await apiClient.delete<TokensResponse>(`/settings/tokens/${key}`)
    return data
  },
}