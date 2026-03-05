import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { routeTree } from './routeTree.gen'
import {
  useAuthStore,
  useUsername,
  useIsAuthenticated,
  useIsLoading,
  useInitialize,
} from '@stores/authStore'
import { AppLoader } from '@layouts/AppLoader'

// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error: unknown) => {
        // Never retry 401/403/404
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status && [401, 403, 404].includes(status)) return false
        return failureCount < 1
      },
    },
  },
})

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingMinMs: 0,
  context: {
    auth: undefined!,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const username        = useUsername()
  const isAuthenticated = useIsAuthenticated()
  const isLoading       = useIsLoading()
  const initialize      = useInitialize()

  // Call initialize exactly once — registers AUTH_EXPIRED_EVENT listener
  // and marks isLoading: false after rehydration from localStorage
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      initialize()
    }
  }, [initialize])

  const auth = {
    username,
    isAuthenticated,
    isLoading,
    clearAuth: useAuthStore.getState().clearAuth,
  }

  if (isLoading) {
    return <AppLoader />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth }} />
    </QueryClientProvider>
  )
}

export default App