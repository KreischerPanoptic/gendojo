import { Text, Box, Group, Badge, PasswordInput, Button, Tooltip, ActionIcon } from '@mantine/core'
import { IconCheck, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import type { TokenType } from '#contracts/enums'

export default function TokenRow({
  label,
  description,
  hint,
  isSet,
  tokenType,
  onSave,
  onClear,
  saving,
  clearing,
}: {
  label: string
  description: string
  hint: string | null
  isSet: boolean
  tokenType: TokenType
  onSave: (type: TokenType, value: string) => Promise<void>
  onClear: (type: TokenType) => Promise<void>
  saving: boolean
  clearing: boolean
}) {
  const [value, setValue] = useState('')

  const handleSave = async () => {
    if (value.trim()) {
      await onSave(tokenType, value.trim())
      setValue('')
    }
  }

  return (
    <Box>
      <Group gap="xs" mb={6}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {isSet ? (
          <Badge size="xs" color="teal" variant="light">
            Set {hint ? `(...${hint})` : ''}
          </Badge>
        ) : (
          <Badge size="xs" color="gray" variant="light">
            Not set
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" mb="xs">
        {description}
      </Text>
      <Group gap="xs" align="center">
        <PasswordInput
          placeholder={isSet ? 'Enter new token to replace…' : 'Paste token…'}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          style={{ flex: 1 }}
          size="xs"
          disabled={saving || clearing}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <Button
          size="xs"
          variant="filled"
          color="orange"
          disabled={!value.trim()}
          loading={saving}
          onClick={handleSave}
          leftSection={<IconCheck size={12} />}
        >
          Save
        </Button>
        {isSet && (
          <Tooltip label={`Clear ${label}`} withArrow>
            <ActionIcon
              size="md"
              variant="subtle"
              color="red"
              loading={clearing}
              onClick={() => onClear(tokenType)}
            >
              <IconTrash size={13} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  )
}
