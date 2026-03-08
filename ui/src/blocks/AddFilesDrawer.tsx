import { IMAGE_AND_TEXT_MIME } from "@lib/constants/files"
import { Drawer, Group, Stack, ThemeIcon, Button, ScrollArea, Progress, Text } from "@mantine/core"
import type { FileWithPath } from "@mantine/dropzone"
import { Dropzone } from "@mantine/dropzone"
import { notifications } from "@mantine/notifications"
import { useUploadDatasetFiles } from "@services/datasets"
import { IconCheck, IconPlus, IconUpload, IconX } from "@tabler/icons-react"
import { useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// AddFilesDrawer
// ─────────────────────────────────────────────────────────────────────────────

export interface AddFilesDrawerProps {
  datasetName: string
  opened: boolean
  onClose: () => void
}

export function AddFilesDrawer({ datasetName, opened, onClose }: AddFilesDrawerProps) {
  const [files, setFiles] = useState<FileWithPath[]>([])
  const { mutateAsync, uploadState, resetProgress } = useUploadDatasetFiles()

  const handleDrop = (incoming: FileWithPath[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...incoming.filter((f) => !existing.has(f.name))]
    })
  }

  const handleClose = () => {
    setFiles([])
    resetProgress()
    onClose()
  }

  const handleUpload = async () => {
    if (!files.length) return
    await mutateAsync({ name: datasetName, files })
    notifications.show({
      title: 'Files added',
      message: `${files.length} file${files.length > 1 ? 's' : ''} added`,
      color: 'teal',
      icon: <IconCheck size={14} />,
    })
    handleClose()
  }

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconPlus size={16} />
          <Text fw={600} size="sm">
            Add files to {datasetName}
          </Text>
        </Group>
      }
      position="right"
      size="sm"
      padding="lg"
    >
      <Stack gap="md">

        {/* Dropzone — show only when no files selected yet */}
        {files.length === 0 ? (
          <Dropzone
            onDrop={handleDrop}
            accept={IMAGE_AND_TEXT_MIME}
            multiple
            disabled={uploadState.isUploading}
          >
            <Group justify="center" gap="md" mih={120} style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <ThemeIcon size={40} variant="light" color="orange" radius="xl">
                  <IconUpload size={18} />
                </ThemeIcon>
              </Dropzone.Accept>
              <Dropzone.Reject>
                <ThemeIcon size={40} variant="light" color="red" radius="xl">
                  <IconX size={18} />
                </ThemeIcon>
              </Dropzone.Reject>
              <Dropzone.Idle>
                <ThemeIcon size={40} variant="light" color="gray" radius="xl">
                  <IconUpload size={18} />
                </ThemeIcon>
              </Dropzone.Idle>
              <Stack gap={2} align="center">
                <Text size="sm" fw={500}>Drop files or click to browse</Text>
                <Text size="xs" c="dimmed">.jpg .png .webp .txt</Text>
              </Stack>
            </Group>
          </Dropzone>
        ) : (
          /* Selected files list */
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" fw={500}>
                {files.length} file{files.length > 1 ? 's' : ''} ready
              </Text>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => setFiles([])}
                disabled={uploadState.isUploading}
              >
                Clear
              </Button>
            </Group>
            <ScrollArea.Autosize mah={200}>
              <Stack gap={2}>
                {files.slice(0, 30).map((f, i) => (
                  <Text
                    key={i}
                    size="xs"
                    c="dimmed"
                    style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}
                  >
                    {f.name}
                  </Text>
                ))}
                {files.length > 30 && (
                  <Text size="xs" c="dimmed">…and {files.length - 30} more</Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        )}

        {/* Progress */}
        {uploadState.isUploading && (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Uploading…</Text>
              <Text size="xs" fw={500}>{uploadState.progress}%</Text>
            </Group>
            <Progress value={uploadState.progress} color="orange" animated size="sm" radius="xl" />
          </Stack>
        )}

        <Group justify="flex-end" mt="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={handleClose}
            disabled={uploadState.isUploading}
          >
            Cancel
          </Button>
          <Button
            leftSection={<IconUpload size={14} />}
            disabled={!files.length || uploadState.isUploading}
            loading={uploadState.isUploading}
            onClick={() => void handleUpload()}
          >
            Upload{files.length > 0 ? ` ${files.length} file${files.length > 1 ? 's' : ''}` : ''}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  )
}