import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AUTH_EXPIRED_EVENT } from '@services/client'

// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null
  username: string | null
  isAuthenticated: boolean
  /** True during the initial app load before we know the auth status */
  isLoading: boolean

  // Actions
  setAuth: (token: string, username: string) => void
  clearAuth: () => void
  initialize: () => void
}

// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAuthenticated: false,
      isLoading: true,

      /**
       * Called after a successful POST /auth/login.
       * Stores token in Zustand state (persisted to localStorage via zustand/persist).
       */
      setAuth: (token, username) =>
        set({ token, username, isAuthenticated: true, isLoading: false }),

      /**
       * Called on logout or when AUTH_EXPIRED_EVENT fires.
       * Clears everything — router guard picks up isAuthenticated: false.
       */
      clearAuth: () =>
        set({ token: null, username: null, isAuthenticated: false, isLoading: false }),

      /**
       * Called once at app startup (__root.tsx / main.tsx).
       *
       * GenDojo uses stateless JWT — there's no /auth/me or /auth/validate
       * endpoint to call. We trust the stored token until it gets a 401.
       * The axios interceptor in client.ts handles expiry automatically.
       */
      initialize: () => {
        // Rehydration from localStorage is handled by zustand/persist automatically.
        // All we need to do here is mark loading as done so the app can render.
        set((state) => ({
          isLoading: false,
          isAuthenticated: !!state.token,
        }))

        // Listen for 401-triggered expiry from the axios interceptor
        window.addEventListener(AUTH_EXPIRED_EVENT, () => {
          useAuthStore.getState().clearAuth()
        })
      },
    }),
    {
      name: 'gendojo_auth',
      partialize: ({ token, username }) => ({ token, username }),
    },
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// Selectors — match the pattern from the uploaded authStore
// ─────────────────────────────────────────────────────────────────────────────

export const useUsername       = () => useAuthStore((s) => s.username)
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated)
export const useIsLoading       = () => useAuthStore((s) => s.isLoading)
export const useSetAuth         = () => useAuthStore((s) => s.setAuth)
export const useClearAuth       = () => useAuthStore((s) => s.clearAuth)
export const useInitialize      = () => useAuthStore((s) => s.initialize)