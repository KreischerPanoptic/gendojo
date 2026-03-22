import { Box, Flex, NavLink, Tooltip, Text, ActionIcon, Divider } from '@mantine/core'
import { IconChevronLeft, IconLayoutSidebar, IconSettings, IconLogout } from '@tabler/icons-react'
import { Link } from '@adonisjs/inertia/react'
import { router, usePage } from '@inertiajs/react'
import { useState, useCallback, useEffect } from 'react'
import { useMenuOpened, useMenuOpen, useMenuClose } from '~/stores/navigation.store'
import type { SideMenuProps } from '~/types/nav.types'
import SystemStats from '~/blocks/navigation/SystemStats'
import RecursiveNavLink from '~/blocks/navigation/RecursiveNavLink'
import { COLLAPSED_W, EXPANDED_W } from '~/constants/nav.constants'

export function SideMenu({ blocks }: SideMenuProps) {
  const opened = useMenuOpened()
  const openMenu = useMenuOpen()
  const closeMenu = useMenuClose()

  const { url } = usePage()

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Auto-expand the active section when sidebar opens
  useEffect(() => {
    if (!opened) return
    blocks.forEach((block, idx) => {
      const hasActiveChild = block.children?.some((c) => c.link && url.startsWith(c.link))
      if (hasActiveChild) {
        setExpandedItems((prev) => {
          const next = new Set(prev)
          next.add(String(idx))
          return next
        })
      }
    })
  }, [opened, blocks, url])

  const handleToggle = useCallback(
    (path: string, hasChildren: boolean) => {
      if (!hasChildren) return
      if (!opened) openMenu()
      setExpandedItems((prev) => {
        const next = new Set(prev)
        if (next.has(path)) {
          for (const key of next) {
            if (key === path || key.startsWith(`${path}-`)) next.delete(key)
          }
        } else {
          next.add(path)
        }
        return next
      })
    },
    [opened, openMenu]
  )

  const w = opened ? EXPANDED_W : COLLAPSED_W

  return (
    <Box
      component="nav"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: w,
        background: 'var(--gd-surface)',
        borderRight: '1px solid var(--gd-border)',
        transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Toggle ──────────────────────────────────────────────────── */}
      <Flex
        align="center"
        justify={opened ? 'space-between' : 'center'}
        px={opened ? 'sm' : 0}
        style={{ height: 52, flexShrink: 0, borderBottom: '1px solid var(--gd-border-sub)' }}
      >
        {opened && (
          <Text
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--gd-accent)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            GenDojo
          </Text>
        )}
        <Tooltip
          label={opened ? 'Collapse' : 'Expand'}
          position="right"
          withArrow
          disabled={opened}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={opened ? closeMenu : openMenu}
            aria-label="Toggle sidebar"
          >
            {opened ? <IconChevronLeft size={16} /> : <IconLayoutSidebar size={16} />}
          </ActionIcon>
        </Tooltip>
      </Flex>

      {/* ── Nav items ───────────────────────────────────────────────── */}
      <Flex
        direction="column"
        gap={2}
        p={6}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {blocks.map((block, idx) => (
          <RecursiveNavLink
            key={block.link ?? block.label}
            block={block}
            path={String(idx)}
            depth={0}
            expandedItems={expandedItems}
            onToggle={handleToggle}
            sidebarOpened={opened}
          />
        ))}
      </Flex>

      {/* ── Bottom section ──────────────────────────────────────────── */}
      <Flex
        direction="column"
        gap={8}
        py="sm"
        style={{ borderTop: '1px solid var(--gd-border-sub)', flexShrink: 0 }}
      >
        <SystemStats expanded={opened} />
        <Divider mx={opened ? 'sm' : 'xs'} />

        <Flex direction="column" gap={2} px={6}>
          {/* Settings */}
          <Tooltip label="Settings" position="right" withArrow disabled={opened}>
            <div>
              <NavLink
                component={Link}
                href="/settings"
                active={url.startsWith('/settings')}
                label={opened ? 'Settings' : undefined}
                leftSection={<IconSettings size={17} stroke={1.5} />}
                styles={{ root: { height: 36, borderRadius: 6 }, label: { fontSize: '0.875rem' } }}
              />
            </div>
          </Tooltip>

          {/* Logout — Inertia router.post instead of mutation */}
          <Tooltip label="Sign out" position="right" withArrow disabled={opened}>
            <div>
              <NavLink
                label={opened ? 'Sign out' : undefined}
                leftSection={<IconLogout size={17} stroke={1.5} />}
                onClick={() => router.post('/logout')}
                styles={{
                  root: { height: 36, borderRadius: 6, color: 'var(--mantine-color-red-6)' },
                  label: { fontSize: '0.875rem', color: 'var(--mantine-color-red-6)' },
                }}
              />
            </div>
          </Tooltip>
        </Flex>
      </Flex>
    </Box>
  )
}
