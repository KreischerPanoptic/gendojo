import { io, type Socket } from 'socket.io-client'

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Socket.IO connection for the /jobs namespace.
//
// Imported by useJobSocket (mutations.ts) — not used directly in components.
// Token is read from localStorage at connect time and passed in auth payload
// for forward compatibility (backend doesn't yet verify WS connections).
//
// IMPORTANT: Socket.IO namespaces live on the raw host — NOT under /api.
// The HTTP REST API uses /api prefix, but WS namespaces bypass that entirely.
// Correct:   io('http://host:3000/jobs')       ← namespace = /jobs
// Wrong:     io('http://host:3000/api/jobs')   ← namespace = /api/jobs → Invalid namespace
// ─────────────────────────────────────────────────────────────────────────────

let socket: Socket | null = null

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('gendojo_auth')
    const parsed = JSON.parse(raw ?? '{}') as { state?: { token?: string } }
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

/**
 * Base URL for Socket.IO — intentionally WITHOUT the /api prefix.
 * REST API:  ${apiBaseURL}/jobs    → http://host:3000/api/jobs
 * WebSocket: ${wsBaseURL}/jobs     → http://host:3000/jobs  (namespace)
 */
function getWsBaseURL(): string {
  if (import.meta.env.DEV) {
    return (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
  }
  // In production the frontend is served by the same host — use empty string
  // so Socket.IO connects to window.location.origin automatically
  return ''
}

export function getJobsSocket(): Socket {
  if (socket?.connected) return socket

  const token = getToken()

  socket = io(`${getWsBaseURL()}/jobs`, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  })

  socket.on('connect_error', (err) => {
    console.warn('[JobsSocket] connect error:', err.message)
  })

  return socket
}

/** Call after logout to drop the connection cleanly. */
export function resetJobsSocket(): void {
  socket?.disconnect()
  socket = null
}

export function disconnectJobsSocket(): void {
  resetJobsSocket()
}