import type { ReactNode } from 'react'
import { useMenuOpened } from '~/stores/navigation.store'

const COLLAPSED_W = 52
const EXPANDED_W = 280

export function MainContent({ children }: { children: ReactNode }) {
  const opened = useMenuOpened()

  return (
    <>
      <div
        className="hidden md:block"
        style={{
          paddingLeft: opened ? EXPANDED_W : COLLAPSED_W,
          minHeight: '100vh',
          transition: 'padding-left 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--gd-bg)',
        }}
      >
        {children}
      </div>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--gd-bg)',
        }}
        className="block md:hidden"
      >
        {children}
      </div>
    </>
  )
}
