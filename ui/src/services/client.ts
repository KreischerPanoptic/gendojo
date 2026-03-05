import axios from 'axios'

export const AUTH_EXPIRED_EVENT = 'gendojo:auth-expired'

/**
 * Central axios instance for all GenDojo API calls.
 *
 * Token strategy:
 *   - JWT stored in localStorage (key: "gendojo_auth")
 *   - Attached as Authorization: Bearer <token> via request interceptor
 *   - On 401: fires AUTH_EXPIRED_EVENT, clears storage, redirects to /login
 *   - No refresh token — server issues 30-day tokens (AUTH_TOKEN_EXPIRES env)
 *
 * Dev mode:
 *   - If AUTH_USERNAME / AUTH_PASSWORD are not set on the server, the guard
 *     passes all requests. Token is still attached but ignored by the backend.
 */
export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── REQUEST: attach Bearer token ────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('gendojo_auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { token?: string } }
      const token = parsed?.state?.token
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    } catch {
      // malformed storage — ignore, request goes through without auth header
    }
  }
  return config
})

// ── RESPONSE: handle 401 globally ───────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      // Don't intercept the login endpoint itself
      !error.config?.url?.includes('/auth/login')
    ) {
      // Clear persisted auth state
      localStorage.removeItem('gendojo_auth')

      // Notify the app — __root.tsx / authStore listener will redirect to /login
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }

    return Promise.reject(error)
  },
)