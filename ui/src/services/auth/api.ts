import { apiClient } from '@services/client'
import type { LoginRequest, LoginResponse } from './types'

export const authApi = {
  /**
   * POST /auth/login
   *
   * In dev mode (AUTH_* env not set on server) any credentials are accepted.
   * Returns a JWT valid for AUTH_TOKEN_EXPIRES (default 30d).
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return data
  },
}