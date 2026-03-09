import {
  Alert,
  Button,
  Checkbox,
  Code,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { IconAlertCircle, IconTag } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePrependToken, type PrependMode, PREPEND_MODE_LABELS } from '@services/datasets'
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface PrependTokenModalProps {
  datasetName: string
  /** Pre-fills the token field from dataset.meta.activationToken if set */
  defaultToken?: string | null
  opened: boolean
  onClose: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview helper — shows what a caption will look like after prepend
// ─────────────────────────────────────────────────────────────────────────────

function buildPreview(token: string, mode: PrependMode): string {
  const t = token.trim() || 'token'
  const rest = 'detailed fur, soft lighting'
  switch (mode) {
    case 'tag_list':     return `${t}, ${rest}`
    case 'nl_prefix':    return `${t}. ${rest}`
    case 'nl_style':     return `In style of ${t}, ${rest}`
    case 'nl_character': return `${t} character, ${rest}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const MODE_DATA: { value: PrependMode; label: string }[] = (
  Object.entries(PREPEND_MODE_LABELS) as [PrependMode, string][]
).map(([value, label]) => ({ value, label }))

export function PrependTokenModal({
  datasetName,
  defaultToken,
  opened,
  onClose,
}: PrependTokenModalProps) {
  const [token, setToken]           = useState(defaultToken ?? '')
  const [mode, setMode]             = useState<PrependMode>('tag_list')
  const [skipExisting, setSkip]     = useState(true)

  const prepend = usePrependToken(datasetName)

  const handleClose = () => {
    // Reset on close so it feels fresh next time
    setToken(defaultToken ?? '')
    setMode('tag_list')
    setSkip(true)
    prepend.reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!token.trim()) return
    const result = await prepend.mutateAsync({ token: token.trim(), mode, skipExisting })
    notifications.show({
      title: 'Token prepended',
      message: `${result.updated} updated · ${result.skipped} skipped · ${result.missing} no caption`,
      color: 'teal',
      autoClose: 4000,
    })
    handleClose()
  }

  const preview = buildPreview(token, mode)
  const isValid = token.trim().length > 0

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconTag size={15} />
          <Text fw={600} size="sm">Prepend activation token</Text>
        </Group>
      }
      size="sm"
      radius="md"
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Bulk-prepend a token to all existing captions in{' '}
          <Text span fw={600} c="default">{datasetName}</Text>.
          Images without a caption file are skipped.
        </Text>

        <TextInput
          label="Token"
          placeholder="my_char"
          value={token}
          onChange={(e) => setToken(e.currentTarget.value)}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          autoFocus
        />

        <Select
          label="Mode"
          data={MODE_DATA}
          value={mode}
          onChange={(val) => val && setMode(val as PrependMode)}
        />

        {/* Live preview */}
        <Stack gap={4}>
          <Text size="xs" fw={500} c="dimmed">Preview</Text>
          <Code
            block
            style={{
              fontSize: '0.75rem',
              lineHeight: 1.6,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {preview}
          </Code>
        </Stack>

        <Checkbox
          label="Skip captions already starting with this token"
          checked={skipExisting}
          onChange={(e) => setSkip(e.currentTarget.checked)}
          size="sm"
        />

        {prepend.isError && (
          <Alert color="red" icon={<IconAlertCircle size={14} />} p="xs" radius="md">
            <Text size="xs">{(prepend.error as Error | null)?.message ?? 'Something went wrong'}</Text>
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={handleClose} disabled={prepend.isPending}>
            Cancel
          </Button>
          <Button
            leftSection={<IconTag size={14} />}
            disabled={!isValid}
            loading={prepend.isPending}
            onClick={() => void handleSubmit()}
          >
            Apply to all captions
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}