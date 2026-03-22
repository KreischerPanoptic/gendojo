import './css/app.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { type ReactElement, useEffect } from 'react'
import { client } from './client'
import AuthLayout from '~/layouts/auth'
import AppLayout from '~/layouts/app'
import type { Data } from '@generated/data'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { useThemeStore } from '~/stores/theme.store'
import type { Theme } from '~/stores/theme.store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const appName = import.meta.env.VITE_APP_NAME || 'GenDojo'

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

const theme = createTheme({
  primaryColor: 'orange',
  fontFamily: 'inherit',
})

// ── Auth pages that use the minimal centered layout ───────────────────────────

function pickLayout(name: string, page: ReactElement<Data.SharedProps>) {
  if (name.startsWith('auth/') || name.startsWith('errors/')) {
    return <AuthLayout>{page}</AuthLayout>
  }
  return <AppLayout>{page}</AppLayout>
}

// ── Theme initializer ────────────────────────────────────────────────────────

function ThemeInit({ serverTheme }: { serverTheme: Theme }) {
  const init = useThemeStore((s) => s.initialize)

  useEffect(() => {
    init(serverTheme)
  }, [init, serverTheme])

  return null
}

// ─────────────────────────────────────────────────────────────────────────────

createInertiaApp({
  title: (title) => (title ? `${title} — ${appName}` : appName),

  resolve: (name) => {
    return resolvePageComponent(
      `./pages/${name}.tsx`,
      import.meta.glob('./pages/**/*.tsx'),
      (page: ReactElement<Data.SharedProps>) => pickLayout(name, page)
    )
  },

  setup({ el, App, props }) {
    const serverTheme = (props.initialPage.props.theme as Theme) || 'auto'
    const initialMantineTheme = serverTheme === 'auto' ? 'dark' : serverTheme

    createRoot(el).render(
      <TuyauProvider client={client}>
        <QueryClientProvider client={queryClient}>
          <MantineProvider theme={theme} defaultColorScheme={initialMantineTheme}>
            <Notifications position="top-right" zIndex={1000} />
            <ThemeInit serverTheme={serverTheme} />
            <App {...props} />
          </MantineProvider>
        </QueryClientProvider>
      </TuyauProvider>
    )
  },

  progress: {
    color: 'var(--mantine-color-orange-6)',
  },
})
