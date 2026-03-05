import { useMenuOpened } from '@stores/navigationStore'

interface MainContentProps {
  children: React.ReactNode
}

const COLLAPSED_W = 52
const EXPANDED_W  = 280

export function MainContent({ children }: MainContentProps) {
  const opened = useMenuOpened()

  return (
    <div
      style={{
        paddingLeft: opened ? EXPANDED_W : COLLAPSED_W,
        minHeight: '100vh',
        transition: 'padding-left 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--gd-bg)',
      }}
    >
      {children}
    </div>
  )
}