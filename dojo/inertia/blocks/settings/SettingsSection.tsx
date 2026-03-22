import { Box, Group, ThemeIcon, Stack, Text } from '@mantine/core'

export default function SettingsSection({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Box>
      <Group gap="sm" mb="xs">
        <ThemeIcon visibleFrom="sm" size={32} variant="light" color="orange" radius="md">
          {icon}
        </ThemeIcon>
        <Stack gap={0}>
          <Group>
            <Text fw={600} size="sm">
              {title}
            </Text>
            {badge}
          </Group>
          {description && (
            <Text size="xs" c="dimmed" className="max-w-34! md:max-w-fit!" truncate="end">
              {description}
            </Text>
          )}
        </Stack>
      </Group>
      <Box ml={44} visibleFrom="sm">
        {children}
      </Box>
      <Box hiddenFrom="sm">{children}</Box>
    </Box>
  )
}
