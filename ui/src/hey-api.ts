import type { CreateClientConfig } from '@api/client.gen'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: (import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
    : ''),
  // auth вызывается для каждого запроса — возвращаем актуальный токен
  auth: () => {
    const raw = localStorage.getItem('gendojo_auth')
    if (!raw) return undefined
    try {
      const parsed = JSON.parse(raw) as { state?: { token?: string } }
      return parsed?.state?.token ?? undefined
    } catch {
      return undefined
    }
  },
})