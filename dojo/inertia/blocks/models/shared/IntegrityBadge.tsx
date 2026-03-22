import type { FileIntegrityResult } from '#types/models'
import { Tooltip, Badge } from '@mantine/core'
import { IconCircleCheck, IconCircleX, IconHelp } from '@tabler/icons-react'
import { INTEGRITY_COLOR, INTEGRITY_LABEL } from '~/constants/models.constants'

export default function IntegrityBadge({ result }: { result: FileIntegrityResult }) {
  const icon =
    result.status === 'ok' ? (
      <IconCircleCheck size={12} />
    ) : result.status === 'corrupted' ? (
      <IconCircleX size={12} />
    ) : (
      <IconHelp size={12} />
    )

  return (
    <Tooltip
      label={
        result.status === 'ok'
          ? `SHA-256 verified`
          : result.status === 'corrupted'
            ? `Expected: ${result.expectedSha256}\nGot: ${result.computedSha256}`
            : `No hash registered — computed: ${result.computedSha256}`
      }
      multiline
      w={340}
      withArrow
    >
      <Badge size="xs" variant="light" color={INTEGRITY_COLOR[result.status]} leftSection={icon}>
        {INTEGRITY_LABEL[result.status]}
      </Badge>
    </Tooltip>
  )
}
