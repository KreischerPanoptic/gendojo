import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context }) => {
    // Если уже залогинен - редирект на главную
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="w-full h-full">
      <div className="p-2">
        <Outlet />
      </div>
    </div>
  )
}