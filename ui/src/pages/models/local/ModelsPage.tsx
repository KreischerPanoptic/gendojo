import { ActionIcon, Group, Select, Stack, Title, Tooltip } from '@mantine/core'
import { IconDownload, IconRefresh } from '@tabler/icons-react'
import { useState } from 'react'
import ModelsTable from '@tables/models/ModelsTable'
import { useRefreshModels, type ModelType } from '@services/models'
import { useNavigate } from '@tanstack/react-router'

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
  const navigate = useNavigate();

  const toDownload = () => {
    navigate({to: '/models/download/hf'})
  }

  return (
    <Stack gap="lg" p="lg" className="w-full">
      <Group justify="space-between" align="center">
        <Title order={3}>Models</Title>

        <Group gap="sm">
          <Tooltip label="Download models from HuggingFace or CivitAI" withArrow>
            <ActionIcon
              variant="outline"
              size="lg"
              onClick={() => toDownload()}
              aria-label="Download models"
            >
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
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