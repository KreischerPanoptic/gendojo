import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from './api'
import type { LoginRequest } from './types'
import { useAuthStore } from '@stores/authStore'

// ─────────────────────────────────────────────────────────────────────────────

export const useLogin = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),

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

export const useLogout = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return useMutation({
    // No logout endpoint — token is stateless JWT, just clear locally
    mutationFn: async () => {
      clearAuth()
    },

    onSuccess: () => {
      // Clear all cached queries so stale data isn't shown after re-login
      queryClient.clear()
      void navigate({ to: '/login' })
    },

    onError: (error) => {
      console.error('[Auth] Logout error:', error)
      // Still clear locally even on error
      clearAuth()
      queryClient.clear()
      void navigate({ to: '/login' })
    },
  })
}