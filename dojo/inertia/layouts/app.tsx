import { usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { navBlocks } from '~/data/nav.data'
import { useMenuClose } from '~/stores/navigation.store'
import { MainContent } from './MainContent'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { SideMenu } from './SideMenu'

// ─────────────────────────────────────────────────────────────────────────────
// Nav data — define your routes here.
// Icons: import from @tabler/icons-react and pass as JSX.
// ─────────────────────────────────────────────────────────────────────────────
//
// Example:
//   import { IconDatabase, IconBriefcase } from '@tabler/icons-react'
//   const navBlocks: Block[] = [
//     { label: 'Datasets', link: '/datasets', icon: <IconDatabase size={17} stroke={1.5} /> },
//     { label: 'Jobs',     link: '/jobs',     icon: <IconBriefcase size={17} stroke={1.5} /> },
//   ]
//
// For now — empty, replace with your actual nav data:

// ─────────────────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: ReactNode }) {
  const closeMenu = useMenuClose()
  const { url } = usePage()

  // Close mobile drawer on navigation
  // biome-ignore lint/correctness/useExhaustiveDependencies: This is how hook should work
  useEffect(() => {
    closeMenu()
  }, [url])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gd-bg)' }}>
      {/*
        Mobile header + drawer — visible only on small screens via CSS.
        On desktop: display:none via .mobile-header / .mobile-nav rules in app.css
      */}
      <MobileHeader />
      <MobileNav blocks={navBlocks} />

      {/*
        Desktop sidebar — visible only on md+ via CSS.
        On mobile: display:none via .desktop-sidebar rule in app.css
      */}
      <div className="desktop-sidebar">
        <SideMenu blocks={navBlocks} />
      </div>

      {/*
        Main content area.
        On mobile: full width, padded from top for MobileHeader.
        On desktop: offset left by sidebar width.
      */}

      <MainContent>
        <main className="pt-14 md:pt-0">{children}</main>
      </MainContent>
    </div>
  )
}
