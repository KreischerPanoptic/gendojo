import { Group, ThemeIcon, Stack, Text } from "@mantine/core"
import { Dropzone, MIME_TYPES } from "@mantine/dropzone"
import { IconUpload, IconX, IconPackage } from "@tabler/icons-react"
import { SelectedFilesList } from "@ui/SelectedFilesList"

// ─────────────────────────────────────────────────────────────────────────────
// ZipDropzone
// ─────────────────────────────────────────────────────────────────────────────

export interface ZipDropzoneProps {
  file: File | null
  onDrop: (file: File) => void
  onClear: () => void
  disabled?: boolean
}

export function ZipDropzone({ file, onDrop, onClear, disabled }: ZipDropzoneProps) {
  if (file) {
    return <SelectedFilesList files={[file]} onClear={onClear} disabled={disabled} />
  }

  return (
    <Dropzone
      onDrop={(files) => { if (files[0]) onDrop(files[0]) }}
      accept={{ [MIME_TYPES.zip]: ['.zip'] }}
      maxFiles={1}
      disabled={disabled}
      styles={{
        root: {
          borderColor: 'var(--mantine-color-default-border)',
          '&[dataAccept]': { borderColor: 'var(--mantine-color-orange-5)' },
        },
      }}
    >
      <Group justify="center" gap="lg" mih={140} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <ThemeIcon size={48} variant="light" color="orange" radius="xl">
            <IconUpload size={22} />
          </ThemeIcon>
        </Dropzone.Accept>
        <Dropzone.Reject>
          <ThemeIcon size={48} variant="light" color="red" radius="xl">
            <IconX size={22} />
          </ThemeIcon>
        </Dropzone.Reject>
        <Dropzone.Idle>
          <ThemeIcon size={48} variant="light" color="gray" radius="xl">
            <IconPackage size={22} />
          </ThemeIcon>
        </Dropzone.Idle>

        <Stack gap={2} align="center">
          <Text fw={500} size="sm">
            Drop your ZIP archive here or click to browse
          </Text>
          <Text size="xs" c="dimmed" ta="center" maw={340}>
            Up to 500 MB. Nested folders are flattened — images land directly in the dataset.
          </Text>
        </Stack>
      </Group>
    </Dropzone>
  )
}