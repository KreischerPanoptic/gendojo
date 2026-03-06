import { IMAGE_AND_TEXT_MIME } from "@lib/constants/files"
import { Group, ThemeIcon, Stack, Text } from "@mantine/core"
import { Dropzone } from "@mantine/dropzone"
import type { FileWithPath } from "@mantine/dropzone"
import { IconUpload, IconX, IconPhoto } from "@tabler/icons-react"
import { SelectedFilesList } from "@ui/SelectedFilesList"

// ─────────────────────────────────────────────────────────────────────────────
// FilesDropzone
// ─────────────────────────────────────────────────────────────────────────────

export interface FilesDropzoneProps {
  files: FileWithPath[]
  onDrop: (incoming: FileWithPath[]) => void
  onClear: () => void
  disabled?: boolean
}

export function FilesDropzone({ files, onDrop, onClear, disabled }: FilesDropzoneProps) {
  if (files.length > 0) {
    return <SelectedFilesList files={files} onClear={onClear} disabled={disabled} />
  }

  return (
    <Dropzone
      onDrop={onDrop}
      accept={IMAGE_AND_TEXT_MIME}
      multiple
      disabled={disabled}
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
            <IconPhoto size={22} />
          </ThemeIcon>
        </Dropzone.Idle>

        <Stack gap={2} align="center">
          <Text fw={500} size="sm">
            Drop images here or click to browse
          </Text>
          <Text size="xs" c="dimmed" ta="center" maw={340}>
            .jpg, .jpeg, .png, .webp and .txt captions accepted.
          </Text>
        </Stack>
      </Group>
    </Dropzone>
  )
}