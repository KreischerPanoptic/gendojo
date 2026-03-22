import type { ModelArchitecture } from '#contracts/enums'
import { Tooltip, ActionIcon, Modal, Stack, Box, Group, Button, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react'
import type { Data } from '@generated/data'
import { formatSize } from '~/utils/models.utils'
import { client } from '~/client'

export default function DeleteFileButton({ model }: { model: Data.WeightsFile }) {
  const [opened, { open, close }] = useDisclosure(false)
  // const { mutate: deleteModel, isPending } = useDeleteModel()

  const confirm = () => {
    client.api.deleteModel({ params: { id: model.id } })
    //deleteModel(model.id, { onSuccess: close })
  }

  return (
    <>
      <Tooltip label="Delete file" withArrow>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="red"
          onClick={open}
          aria-label={`Delete ${model.filename}`}
        >
          <IconTrash size={13} />
        </ActionIcon>
      </Tooltip>

      <Modal opened={opened} onClose={close} title="Delete model file" size="sm" centered>
        <Stack gap="md">
          <Text size="sm">
            Delete{' '}
            <Text component="span" fw={600} style={{ fontFamily: 'var(--font-mono)' }}>
              {model.filename}
            </Text>
            {'  '}
            <Text component="span" size="xs" c="dimmed">
              ({formatSize(Number.parseInt(model.sizeBytes, 10))})
            </Text>
          </Text>

          {/* Warn if deleting this shared file will break other architectures */}
          {model.sharedWith && model.sharedWith.length > 0 && (
            <Box
              p="xs"
              style={{
                borderRadius: 6,
                background: 'var(--mantine-color-orange-light)',
                border: '1px solid var(--mantine-color-orange-light-hover)',
              }}
            >
              <Group gap="xs" mb={4}>
                <IconAlertTriangle size={13} color="var(--mantine-color-orange-6)" />
                <Text size="xs" fw={600} c="orange">
                  Shared file
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Also used by:{' '}
                {(model.sharedWith as ModelArchitecture[])
                  .map((a) => ARCH_LABEL[a] ?? a)
                  .join(', ')}
                . Deleting it will break readiness for those architectures.
              </Text>
            </Box>
          )}

          <Text size="xs" c="dimmed">
            This cannot be undone.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="xs" onClick={close}>
              Cancel
            </Button>
            <Button color="red" size="xs" loading={isPending} onClick={confirm}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
