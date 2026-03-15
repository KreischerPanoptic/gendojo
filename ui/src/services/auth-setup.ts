import { client } from '@api/client.gen'
import axios from 'axios'

export function setupAuthInterceptors() {
  client.instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        !error.config?.url?.includes('/auth/login')
      ) {
        localStorage.removeItem('gendojo_auth')
        window.dispatchEvent(new CustomEvent('gendojo:auth-expired'))
      }
      return Promise.reject(error)
    },
  )
}