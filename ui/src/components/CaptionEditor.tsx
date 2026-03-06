import { ActionIcon, Badge, Group, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  datasetsApi,
  useCaption,
  useUpsertCaption,
  type DatasetImage,
} from '@services/datasets'
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconTag,
  IconTagOff,
} from '@tabler/icons-react'
import { useState } from 'react'
import { CaptionEditForm } from '@forms/dataset/captions/edit/CaptionEditForm'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptionEditorProps {
  image: DatasetImage
  datasetName: string
  onNavigatePrev: (() => void) | null
  onNavigateNext: (() => void) | null
  currentIndex: number
  total: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CaptionEditor({
  image,
  datasetName,
  onNavigatePrev,
  onNavigateNext,
  currentIndex,
  total,
}: CaptionEditorProps) {
  // editedCaption === null  →  user hasn't touched the field, display server value
  // editedCaption === ''    →  user explicitly cleared the caption
  const [editedCaption, setEditedCaption] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  // ── Reset local state when image changes (adjust-state-during-render) ──────
  const [prevFilename, setPrevFilename] = useState(image.filename)
  if (prevFilename !== image.filename) {
    setPrevFilename(image.filename)
    setEditedCaption(null)
    setImgError(false)
  }

  const upsert = useUpsertCaption(datasetName)
  const src = datasetsApi.getImageUrl(datasetName, image.filename)
  const { data: captionData, isLoading: captionLoading } = useCaption(datasetName, image.filename)

  const serverCaption = captionData?.caption ?? ''
  // Show user's edits if any, otherwise the server value
  const localCaption = editedCaption ?? serverCaption
  // Dirty only if user changed something that differs from what's saved
  const isDirty = editedCaption !== null && editedCaption !== serverCaption

  const handleChange = (value: string) => setEditedCaption(value)

  const handleSave = async () => {
    await upsert.mutateAsync({ imageName: image.filename, caption: localCaption })
    setEditedCaption(null) // return to "tracking server value"
    notifications.show({
      title: 'Caption saved',
      message: image.filename,
      color: 'teal',
      icon: <IconCheck size={14} />,
      autoClose: 2000,
    })
  }

  return (
    <Stack gap="md">
      {/* Navigation + caption badge */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <ActionIcon variant="subtle" disabled={!onNavigatePrev} onClick={onNavigatePrev ?? undefined} size="sm">
            <IconChevronLeft size={14} />
          </ActionIcon>
          <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {currentIndex + 1} / {total}
          </Text>
          <ActionIcon variant="subtle" disabled={!onNavigateNext} onClick={onNavigateNext ?? undefined} size="sm">
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
        <Badge
          size="xs"
          color={image.hasCaption ? 'teal' : 'gray'}
          variant="light"
          leftSection={image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}
        >
          {image.hasCaption ? 'captioned' : 'no caption'}
        </Badge>
      </Group>

      <CaptionEditForm
        image={image}
        src={src}
        captionLoading={captionLoading}
        localCaption={localCaption}
        isDirty={isDirty}
        isSaving={upsert.isPending}
        isError={upsert.isError}
        errorMessage={(upsert.error as Error | null)?.message}
        imgError={imgError}
        onImgError={() => setImgError(true)}
        onChange={handleChange}
        onSave={() => void handleSave()}
      />
    </Stack>
  )
}