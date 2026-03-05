import { ActionIcon, Group, Select, Stack, Title, Tooltip } from '@mantine/core'
import { IconRefresh } from '@tabler/icons-react'
import { useState } from 'react'
import ModelsTable from '@tables/models/ModelsTable'
import { useRefreshModels, type ModelType } from '@services/models'

// ─────────────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'checkpoint',   label: 'Checkpoint' },
  { value: 'lora',         label: 'LoRA' },
  { value: 'vae',          label: 'VAE' },
  { value: 'text_encoder', label: 'Text Encoder' },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function ModelsPage() {
  const [typeFilter, setTypeFilter] = useState<ModelType | null>(null)
  const { mutate: refresh, isPending: isRefreshing } = useRefreshModels()

  return (
    <Stack gap="lg" p="lg" className="w-full">
      <Group justify="space-between" align="center">
        <Title order={3}>Models</Title>

        <Group gap="sm">
          <Select
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
          </Tooltip>
        </Group>
      </Group>

      <ModelsTable typeFilter={typeFilter ?? undefined} />
    </Stack>
  )
}