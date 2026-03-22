import { useState } from 'react'
import { Group, Button, Text } from '@mantine/core'
import { IconSun, IconMoon, IconCheck, IconX } from '@tabler/icons-react'
import { useThemeStore } from '~/stores/theme.store'
import SettingsSection from './SettingsSection'
// eslint-disable-next-line @adonisjs/no-backend-import-in-frontend
import { Theme } from '#contracts/enums'
import { notifications } from '@mantine/notifications'
import { useChangeTheme, useTheme } from '~/services/settings'

export default function AppearanceSection({ theme: initialTheme }: { theme: Theme }) {
  const { isLoading } = useTheme(initialTheme)
  const currentTheme = useThemeStore((s) => s.theme)
  const { setTheme } = useThemeStore()

  const changeTheme = useChangeTheme()

  const isDark =
    currentTheme === 'dark' ||
    (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const updateTheme = async (newTheme: 'dark' | 'light') => {
    if (isLoading) return
    setTheme(newTheme)

    await changeTheme
      .mutateAsync({ theme: (newTheme as Theme) ?? Theme.AUTO })
      .catch((error: any) => {
        console.error('Failed to save theme:', error)
        setTheme(initialTheme === Theme.DARK ? 'dark' : 'light')
        notifications.show({
          title: 'Theme change failed',
          message: 'There was a problem syncing your theme selection. Please try again.',
          color: 'red',
          icon: <IconX size={16} />,
        })
      })
  }

  return (
    <SettingsSection
      icon={<IconSun size={16} />}
      title="Appearance"
      description="Interface theme preference"
    >
      <Group gap="sm" align="center">
        <Button
          variant={isDark ? 'filled' : 'outline'}
          size="xs"
          leftSection={<IconMoon size={14} />}
          onClick={() => !isDark && updateTheme('dark')}
          color="dark"
          loading={isLoading && !isDark}
        >
          Dark
        </Button>
        <Button
          variant={!isDark ? 'filled' : 'outline'}
          size="xs"
          leftSection={<IconSun size={14} />}
          onClick={() => isDark && updateTheme('light')}
          color="orange"
          loading={isLoading && isDark}
        >
          Light
        </Button>
        <Text size="xs" c="dimmed">
          Current: <strong>{isDark ? 'Dark' : 'Light'}</strong>
        </Text>
      </Group>
    </SettingsSection>
  )
}
