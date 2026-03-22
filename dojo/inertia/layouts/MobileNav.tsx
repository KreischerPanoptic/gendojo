import { Drawer, Flex, Text, NavLink, Divider, Box } from '@mantine/core'
import { IconSettings, IconLogout } from '@tabler/icons-react'
import { Link } from '@adonisjs/inertia/react'
import { router, usePage } from '@inertiajs/react'
import { useMenuOpened, useMenuClose } from '~/stores/navigation.store'
import type { Block } from '../types/nav.types'

// ─────────────────────────────────────────────────────────────────────────────
// Flat nav item — no collapse/expand on mobile, everything visible
// ─────────────────────────────────────────────────────────────────────────────

function MobileNavItem({ block, onClose }: { block: Block; onClose: () => void }) {
  const { url } = usePage()
  const hasChildren = Boolean(block.children?.length)

  const isActive = block.link
    ? hasChildren
      ? url.startsWith(block.link)
      : url === block.link
    : false

  if (hasChildren) {
    return (
      <Box>
        {/* Section header — label only, not clickable */}
        <Text
          size="xs"
          style={{
            paddingInline: 12,
            paddingBlock: '8px 4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--mantine-color-dimmed)',
          }}
        >
          {block.label}
        </Text>
        {block.children
          ? block.children.map((child) => (
              <MobileNavItem key={child.link ?? child.label} block={child} onClose={onClose} />
            ))
          : null}
      </Box>
    )
  }

  return (
    <NavLink
      component={block.link && !block.disabled ? Link : undefined}
      href={block.link ?? undefined}
      label={block.label}
      leftSection={block.icon}
      disabled={block.disabled}
      active={isActive}
      onClick={() => {
        if (!block.disabled) onClose()
      }}
      styles={{
        root: { height: 44, borderRadius: 8, paddingInline: 12 },
        label: { fontSize: '0.9rem', fontWeight: isActive ? 600 : 400 },
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile drawer — full-screen on xs/sm, partial on md+
// Matches Claude's mobile navigation pattern.
// ─────────────────────────────────────────────────────────────────────────────

export function MobileNav({ blocks }: { blocks: Block[] }) {
  const opened = useMenuOpened()
  const closeMenu = useMenuClose()
  const { url } = usePage()

  const handleLogout = () => {
    closeMenu()
    router.post('/logout')
  }

  return (
    <Drawer
      opened={opened}
      onClose={closeMenu}
      withCloseButton={false}
      padding={0}
      className="mobile-nav"
      size="100%" // full-screen on mobile
      styles={{
        content: {
          background: 'var(--gd-surface)',
          display: 'flex',
          flexDirection: 'column',
        },
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        },
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <Flex
        align="center"
        justify="space-between"
        px="md"
        style={{
          height: 56,
          flexShrink: 0,
          borderBottom: '1px solid var(--gd-border-sub)',
        }}
      >
        <Text
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--gd-accent)',
            letterSpacing: '-0.01em',
          }}
        >
          GenDojo
        </Text>

        {/* Close button — X icon, right side */}
        <button
          type="button"
          onClick={closeMenu}
          aria-label="Close menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            color: 'var(--mantine-color-dimmed)',
            display: 'flex',
            alignItems: 'center',
            width: 'auto',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <title>Close</title>
            <path
              d="M4 4L16 16M16 4L4 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </Flex>

      {/* ── Nav items — scrollable ─────────────────────────────────────── */}
      <Flex direction="column" gap={2} p={8} style={{ flex: 1, overflowY: 'auto' }}>
        {blocks.map((block) => (
          <MobileNavItem key={block.link ?? block.label} block={block} onClose={closeMenu} />
        ))}
      </Flex>

      {/* ── Bottom — settings + logout ─────────────────────────────────── */}
      <Flex
        direction="column"
        gap={2}
        px={8}
        pb="md"
        style={{ borderTop: '1px solid var(--gd-border-sub)', flexShrink: 0, paddingTop: 8 }}
      >
        <NavLink
          component={Link}
          href="/settings/security"
          active={url.startsWith('/settings')}
          label="Settings"
          leftSection={<IconSettings size={18} stroke={1.5} />}
          onClick={closeMenu}
          styles={{
            root: { height: 44, borderRadius: 8, paddingInline: 12 },
            label: { fontSize: '0.9rem' },
          }}
        />
        <Divider my={4} />
        <NavLink
          label="Sign out"
          leftSection={<IconLogout size={18} stroke={1.5} />}
          onClick={handleLogout}
          styles={{
            root: {
              height: 44,
              borderRadius: 8,
              paddingInline: 12,
              color: 'var(--mantine-color-red-6)',
            },
            label: { fontSize: '0.9rem', color: 'var(--mantine-color-red-6)' },
          }}
        />
      </Flex>
    </Drawer>
  )
}
