import type { ReactNode } from 'react'

/**
 * Minimal layout for unauthenticated pages (login, mfa).
 * No sidebar, no header — just a centered full-height canvas.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--mantine-color-dark-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}
