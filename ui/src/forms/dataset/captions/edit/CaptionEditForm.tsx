import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPhotoOff,
  IconTrash,
} from '@tabler/icons-react'
import type { CaptionStats, DatasetImage } from '@services/datasets'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptionEditFormProps {
  image: DatasetImage
  src: string
  captionLoading: boolean
  localCaption: string
  /** Stats computed from localCaption in real-time (null when textarea is loading) */
  captionStats: CaptionStats | null
  isDirty: boolean
  isSaving: boolean
  isError: boolean
  errorMessage?: string
  imgError: boolean
  onImgError: () => void
  onChange: (value: string) => void
  onSave: () => void
  /** Called when user clicks "Clear caption" — deletes the .txt file */
  onDeleteCaption: () => void
  isDeletingCaption: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CaptionEditForm({
  image,
  src,
  captionLoading,
  localCaption,
  captionStats,
  isDirty,
  isSaving,
  isError,
  errorMessage,
  imgError,
  onImgError,
  onChange,
  onSave,
  onDeleteCaption,
  isDeletingCaption,
}: CaptionEditFormProps) {
  return (
    <>
      {/* Image preview */}
      <Box
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          background: 'var(--mantine-color-dark-6)',
          aspectRatio: '1',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {imgError ? (
          <Stack align="center" gap="xs">
            <IconPhotoOff size={32} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="xs" c="dimmed">Preview unavailable</Text>
          </Stack>
        ) : (
          <img
            src={src}
            alt={image.filename}
            onError={onImgError}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
      </Box>

      {/* Filename + size */}
      <Text
        size="xs"
        c="dimmed"
        style={{
          fontFamily: 'var(--mantine-font-family-monospace)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={image.filename}
      >
        {image.filename}
        <Text span c="dimmed" ml={6}>
          ({(image.sizeBytes / 1024).toFixed(0)} KB)
        </Text>
      </Text>

      <Divider />

      {/* Caption textarea */}
      {captionLoading ? (
        <Stack gap={6}>
          <Skeleton height={12} width={60} />
          <Skeleton height={80} radius="sm" />
        </Stack>
      ) : (
        <Textarea
          label="Caption"
          description="Training caption for this image"
          placeholder="a photo of my_char, detailed fur, soft lighting..."
          value={localCaption}
          onChange={(e) => onChange(e.currentTarget.value)}
          autosize
          minRows={4}
          maxRows={10}
          styles={{
            input: {
              fontFamily: 'var(--mantine-font-family-monospace)',
              fontSize: '0.8rem',
            },
          }}
        />
      )}

      {/* Caption stats — real-time length feedback */}
      {!captionLoading && captionStats && (
        <Stack gap={4}>
          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {captionStats.charCount} chars · {captionStats.wordCount} words
            </Text>

            {captionStats.isLongForClip && (
              <Tooltip
                label="Caption likely exceeds 77 tokens (CLIP limit). May be truncated for SD 1/2/SDXL training."
                multiline
                maw={260}
                withArrow
              >
                <Group gap={3} style={{ cursor: 'default' }}>
                  <IconAlertTriangle size={12} color="var(--mantine-color-orange-5)" />
                  <Text size="xs" c="orange.5" fw={500}>Long for CLIP</Text>
                </Group>
              </Tooltip>
            )}

            {captionStats.isLongForT5 && (
              <Tooltip
                label="Caption likely exceeds 256 tokens (T5 limit). May be truncated for FLUX / SD3 / Hunyuan training."
                multiline
                maw={260}
                withArrow
              >
                <Group gap={3} style={{ cursor: 'default' }}>
                  <IconAlertTriangle size={12} color="var(--mantine-color-yellow-5)" />
                  <Text size="xs" c="yellow.5" fw={500}>Long for T5</Text>
                </Group>
              </Tooltip>
            )}
          </Group>
        </Stack>
      )}

      {/* Actions row */}
      <Group gap="xs">
        <Button
          flex={1}
          leftSection={<IconDeviceFloppy size={15} />}
          disabled={!isDirty || isSaving || captionLoading}
          loading={isSaving}
          onClick={onSave}
          variant={isDirty ? 'filled' : 'outline'}
          color={isDirty ? 'orange' : 'gray'}
          size="sm"
        >
          {isDirty ? 'Save' : 'Saved'}
        </Button>

        {image.hasCaption && (
          <Tooltip label="Clear caption (delete .txt file)" withArrow>
            <Button
              variant="subtle"
              color="red"
              size="sm"
              px="xs"
              loading={isDeletingCaption}
              disabled={isSaving || captionLoading}
              onClick={onDeleteCaption}
            >
              <IconTrash size={15} />
            </Button>
          </Tooltip>
        )}
      </Group>

      {/* Mutation error */}
      {isError && (
        <Alert color="red" icon={<IconAlertCircle size={14} />} p="xs" radius="md">
          <Text size="xs">{errorMessage}</Text>
        </Alert>
      )}
    </>
  )
}