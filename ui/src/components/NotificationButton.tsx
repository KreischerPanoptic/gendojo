import { ActionIcon, Indicator, Tooltip } from '@mantine/core'
import { IconBell } from '@tabler/icons-react'

interface NotificationsButtonProps {
  unreadCount?: number
}

/**
 * Floating notifications button — fixed top-right corner.
 * Rendered once in _authenticated layout, not inside the sidebar.
 *
 * When notification system is built out, replace unreadCount with
 * a real query (e.g. useNotifications()).
 */
export function NotificationsButton({ unreadCount = 0 }: NotificationsButtonProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 200,
      }}
    >
      <Tooltip label="Notifications" position="left" withArrow>
        <Indicator
          color="orange"
          size={8}
          offset={4}
          disabled={unreadCount === 0}
          processing={unreadCount > 0}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Notifications"
            style={{
              background: 'var(--gd-surface)',
              border: '1px solid var(--gd-border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <IconBell size={17} stroke={1.5} />
          </ActionIcon>
        </Indicator>
      </Tooltip>
    </div>
  )
}