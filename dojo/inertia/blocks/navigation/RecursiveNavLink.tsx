import { Box, NavLink, Tooltip } from '@mantine/core'
import { Link } from '@adonisjs/inertia/react'
import { router, usePage } from '@inertiajs/react'
import type { RecursiveNavLinkProps } from '~/types/nav.types'
import { COLLAPSED_W } from '~/constants/nav.constants'

export default function RecursiveNavLink({
  block,
  path,
  depth,
  expandedItems,
  onToggle,
  sidebarOpened,
}: RecursiveNavLinkProps) {
  const { url } = usePage()
  const hasChildren = Boolean(block.children?.length)
  const isExpanded = expandedItems.has(path)

  const isActive = block.link
    ? hasChildren
      ? url.startsWith(block.link)
      : url === block.link
    : false

  const isChildActive = hasChildren
    ? (block.children?.some((c) => c.link && url.startsWith(c.link)) ?? false)
    : false

  const showActiveIndicator = !sidebarOpened && depth === 0 && (isActive || isChildActive)

  const handleClick = () => {
    // Collapsed parent with children + link → navigate directly
    if (!sidebarOpened && hasChildren && block.link) {
      router.visit(block.link) // replaces useNavigate
      return
    }
    onToggle(path, hasChildren)
  }

  const navLink = (
    <Box style={{ position: 'relative' }}>
      {showActiveIndicator && (
        <>
          <Box
            style={{
              position: 'absolute',
              right: -7,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 52,
              height: 40,
              background: 'linear-gradient(to left, rgba(249, 115, 22, 0.12), transparent)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <Box
            style={{
              position: 'absolute',
              right: -7,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 44,
              borderRadius: '3px 0 0 3px',
              background: 'var(--gd-accent)',
              zIndex: 101,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
      <NavLink
        // Inertia Link uses href, not to
        component={!hasChildren && block.link ? Link : undefined}
        href={!hasChildren && block.link ? block.link : undefined}
        label={sidebarOpened ? block.label : depth === 0 ? undefined : block.label}
        leftSection={block.icon}
        childrenOffset={depth === 0 ? COLLAPSED_W - 4 : 24}
        disabled={block.disabled}
        opened={isExpanded}
        active={isActive && !hasChildren}
        onClick={handleClick}
        styles={{
          root: { height: 40, borderRadius: 6, transition: 'background 120ms ease' },
          label: { fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 },
        }}
      >
        {sidebarOpened &&
          block.children?.map((child, idx) => (
            <RecursiveNavLink
              key={child.link ?? child.label}
              block={child}
              path={`${path}-${idx}`}
              depth={depth + 1}
              expandedItems={expandedItems}
              onToggle={onToggle}
              sidebarOpened={sidebarOpened}
            />
          ))}
      </NavLink>
    </Box>
  )

  if (depth === 0 && !sidebarOpened) {
    return (
      <Tooltip
        label={block.disabled ? `${block.label} (coming soon)` : block.label}
        position="right"
        withArrow
        offset={8}
      >
        <div>{navLink}</div>
      </Tooltip>
    )
  }

  return navLink
}
