import {
  Stack,
  Group,
  Divider,
  Box,
  ThemeIcon,
  Title,
  ActionIcon,
  Select,
  Tooltip,
} from '@mantine/core'
import { IconDownload, IconFile3d, IconSettings } from '@tabler/icons-react'
import type { InertiaProps } from '~/types'
import type { Data } from '@generated/data'

// ─────────────────────────────────────────────────────────────────────────────

type PageProps = InertiaProps<{ models: Data.WeightsFile[] }>
// ─────────────────────────────────────────────────────────────────────────────

export default function Models({ models }: PageProps) {
  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box
        p="xs"
        pb="xs"
        className="bg-(--gd-surface-tint)!"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        visibleFrom="sm"
      >
        <Group gap="sm" align="center" justify="space-between">
          <ThemeIcon size={28} variant="transparent" color="orange">
            <IconFile3d size={20} />
          </ThemeIcon>
          <Title order={3}>Models</Title>
          <Group gap="sm">
            <Tooltip label="Download models from HuggingFace or CivitAI" withArrow>
              <ActionIcon
                variant="outline"
                size="lg"
                // onClick={() => toDownload()}
                aria-label="Download models"
              >
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
            {/*<Select
              size="sm"
              w={150}
              placeholder="All types"
              data={TYPE_OPTIONS}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as ModelType | null)}
              clearable
            />
            <Tooltip label="Rescan models directory" withArrow>
              <ActionIcon
                variant="outline"
                size="lg"
                loading={isRefreshing}
                onClick={() => refresh()}
                aria-label="Refresh models"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>*/}
          </Group>
        </Group>
      </Box>

      {/* Content */}
      <Box p="lg" style={{ overflowY: 'auto', flex: 1 }}>
        {models?.map((m, i) => (
          <div key={m.id}>
            <span>{m.name}</span>
          </div>
        ))}
      </Box>
    </Stack>
  )
}
