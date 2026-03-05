import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { SideMenu } from '@layouts/SideMenu'
import { MainContent } from '@layouts/MainContent'
import { NotificationsButton } from '@ui/NotificationButton'
import { navBlocks } from '@data/nav.data'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})

// ─────────────────────────────────────────────────────────────────────────────

function AuthenticatedLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gd-bg)' }}>
      <SideMenu blocks={navBlocks} />

      <MainContent>
        <Outlet />
      </MainContent>

      {/* Floating — top right corner, above everything */}
      <NotificationsButton />
    </div>
  )
}