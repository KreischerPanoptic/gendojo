import { Badge, Button, Group, Paper, Stack, ThemeIcon, Text } from "@mantine/core"
import { IconCheck, IconX, IconFile } from "@tabler/icons-react"

// ─────────────────────────────────────────────────────────────────────────────
// SelectedFilesList — shown after files are picked
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectedFilesListProps {
  files: File[]
  onClear: () => void
  disabled?: boolean
}

export function SelectedFilesList({ files, onClear, disabled }: SelectedFilesListProps) {
  const preview = files.slice(0, 6)
  const overflow = files.length - preview.length
  const totalMb = (files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{ borderColor: 'var(--mantine-color-orange-6)', borderStyle: 'solid', borderWidth: 1 }}
    >
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ThemeIcon color="orange" variant="light" size="sm" radius="xl">
            <IconCheck size={13} />
          </ThemeIcon>
          <Text size="sm" fw={600}>
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </Text>
          <Badge size="xs" variant="light" color="orange">
            {totalMb} MB
          </Badge>
        </Group>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          leftSection={<IconX size={11} />}
          onClick={onClear}
          disabled={disabled}
        >
          Clear
        </Button>
      </Group>

      <Stack gap={3}>
        {preview.map((f, i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            <IconFile size={12} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
            <Text
              size="xs"
              c="dimmed"
              style={{
                fontFamily: 'var(--mantine-font-family-monospace)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {f.name}
            </Text>
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {(f.size / 1024).toFixed(0)} KB
            </Text>
          </Group>
        ))}
        {overflow > 0 && (
          <Text size="xs" c="dimmed" pl={16}>
            … and {overflow} more
          </Text>
        )}
      </Stack>
    </Paper>
  )
}