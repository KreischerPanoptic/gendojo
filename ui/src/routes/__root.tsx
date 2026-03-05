import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// ─────────────────────────────────────────────────────────────────────────────
// Router context
//
// GenDojo auth is simpler than the other project:
//   - No user profile object (no /auth/me endpoint)
//   - No refreshToken (stateless 30d JWT)
//   - clearAuth() instead of logout() — mutation in useLogout handles navigation
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContext {
  username: string | null
  isAuthenticated: boolean
  isLoading: boolean
  clearAuth: () => void
}

interface RouterContext {
  auth: AuthContext
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  )
}