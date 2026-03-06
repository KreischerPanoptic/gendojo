import {
  Alert,
  Box,
  Button,
  Divider,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconDeviceFloppy,
  IconPhotoOff,
} from '@tabler/icons-react'
import type { DatasetImage } from '@services/datasets'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptionEditFormProps {
  image: DatasetImage
  /** Pre-built image URL from datasetsApi.getImageUrl */
  src: string
  captionLoading: boolean
  localCaption: string
  isDirty: boolean
  isSaving: boolean
  isError: boolean
  errorMessage?: string
  imgError: boolean
  onImgError: () => void
  onChange: (value: string) => void
  onSave: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CaptionEditForm({
  image,
  src,
  captionLoading,
  localCaption,
  isDirty,
  isSaving,
  isError,
  errorMessage,
  imgError,
  onImgError,
  onChange,
  onSave,
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

      {/* Save button */}
      <Button
        leftSection={<IconDeviceFloppy size={15} />}
        disabled={!isDirty || isSaving || captionLoading}
        loading={isSaving}
        onClick={onSave}
        variant={isDirty ? 'filled' : 'outline'}
        color={isDirty ? 'orange' : 'gray'}
        size="sm"
      >
        {isDirty ? 'Save Caption' : 'Saved'}
      </Button>

      {/* Mutation error */}
      {isError && (
        <Alert color="red" icon={<IconAlertCircle size={14} />} p="xs" radius="md">
          <Text size="xs">{errorMessage}</Text>
        </Alert>
      )}
    </>
  )
}