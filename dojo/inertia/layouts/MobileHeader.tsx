import { Flex, Text, Burger } from '@mantine/core'
import { useMenuOpened, useMenuToggle } from '~/stores/navigation.store'

/**
 * Shown only on mobile (hidden via CSS on md+).
 * Contains burger button + wordmark.
 * The desktop SideMenu has its own toggle built in.
 */
export function MobileHeader() {
  const opened = useMenuOpened()
  const toggle = useMenuToggle()

  return (
    <Flex
      component="header"
      align="center"
      justify="space-between"
      px="md"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'var(--gd-surface)',
        borderBottom: '1px solid var(--gd-border)',
        zIndex: 200,
        // Hidden on desktop — desktop uses SideMenu's own toggle
        display: 'flex',
      }}
      className="mobile-header"
    >
      <Burger
        opened={opened}
        onClick={toggle}
        size="sm"
        lineSize={1.5}
        aria-label="Toggle navigation"
      />

      <Text
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '0.95rem',
          color: 'var(--gd-accent)',
          letterSpacing: '-0.01em',
        }}
      >
        GenDojo
      </Text>

      {/* Right side placeholder — add theme toggle, notifications, etc. */}
      <div style={{ width: 32 }} />
    </Flex>
  )
}
