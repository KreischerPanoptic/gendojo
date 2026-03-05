import { io, type Socket } from 'socket.io-client'

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Socket.IO connection for the /jobs namespace.
//
// Imported by useJobSocket (mutations.ts) — not used directly in components.
// Token is read from localStorage at connect time and passed in auth payload
// for forward compatibility (backend doesn't yet verify WS connections).
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

export function getJobsSocket(): Socket {
  if (socket?.connected) return socket

  const baseURL =
    (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

  const token = getToken()

  socket = io(`${baseURL}/jobs`, {
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