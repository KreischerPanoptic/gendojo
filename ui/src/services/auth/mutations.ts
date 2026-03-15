import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from './api'
import { useAuthStore } from '@stores/authStore'
import type { LoginDto, MfaSetupResponseDto, MfaTokenDto } from '@api/types.gen'

// ─────────────────────────────────────────────────────────────────────────────

export const useLogin = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),

    onSuccess: ({ accessToken, username }) => {
      setAuth(accessToken, username)
      void navigate({ to: '/datasets' })
    },

    onError: (error) => {
      console.error('[Auth] Login failed:', error)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export const useMfaSetup = () => {
  return useMutation<MfaSetupResponseDto, Error, void>({
    mutationFn: () => authApi.mfaSetup(),

    onError: (error) => {
      console.error('[Auth] MFA setup failed:', error)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export const useMfaEnable = () => {
  return useMutation({
    mutationFn: (token: MfaTokenDto) => authApi.mfaEnable(token),

    onError: (error) => {
      console.error('[Auth] MFA enable failed:', error)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export const useMfaVerify = () => {
  return useMutation({
    mutationFn: (token: MfaTokenDto) => authApi.mfaVerify(token),

    onError: (error) => {
      console.error('[Auth] MFA verify failed:', error)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export const useLogout = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return useMutation({
    mutationFn: async () => {
      clearAuth()
    },

    onSuccess: () => {
      queryClient.clear()
      void navigate({ to: '/login' })
    },

    onError: (error) => {
      console.error('[Auth] Logout error:', error)
      clearAuth()
      queryClient.clear()
      void navigate({ to: '/login' })
    },
  })
}