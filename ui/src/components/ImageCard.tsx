import { Box, Loader, Stack, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core'
import { IconPhotoOff, IconRefresh, IconTag, IconTagOff, IconTrash } from '@tabler/icons-react'
import { datasetsApi, useDeleteImage, useReplaceImage } from '@services/datasets'
import type { DatasetImage } from '@services/datasets'
import { useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'

// ─────────────────────────────────────────────────────────────────────────────
// ImageCard — shared thumbnail for dataset grids
//
// Used in:
//   • ViewDatasetPage  — gallery viewer (no selection, no edit actions)
//   • EditDatasetPage  — caption editor (selection outline + delete/replace)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageCardProps {
  image: DatasetImage
  datasetName: string
  onClick: () => void
  /** Renders an orange selection outline. Used in the caption editor. */
  isSelected?: boolean
  /**
   * When true, hovering the card reveals delete and replace icon buttons.
   * Should only be set in EditDatasetPage.
   */
  editMode?: boolean
}

export function ImageCard({
  image,
  datasetName,
  onClick,
  isSelected = false,
  editMode = false,
}: ImageCardProps) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const deleteImage  = useDeleteImage(datasetName)
  const replaceImage = useReplaceImage(datasetName)
  const src = datasetsApi.getImageUrl(datasetName, image.filename)

  const isBusy = deleteImage.isPending || replaceImage.isPending

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isBusy) return
    deleteImage.mutate(image.filename, {
      onSuccess: () =>
        notifications.show({
          message: `Deleted ${image.filename}`,
          color: 'red',
          autoClose: 2000,
        }),
    })
  }

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isBusy) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    replaceImage.mutate(
      { filename: image.filename, file },
      {
        onSuccess: () =>
          notifications.show({
            message: `Replaced ${image.filename}`,
            color: 'teal',
            autoClose: 2000,
          }),
        onError: (err) =>
          notifications.show({
            message: (err as Error).message,
            color: 'red',
            autoClose: 4000,
          }),
      },
    )
    // Reset so the same file can be selected again if needed
    e.target.value = ''
  }

  const showOverlay = editMode && hovered && !isBusy
  const ext = image.filename.split('.').pop()?.toLowerCase() ?? 'jpg'

  return (
    <Box
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hidden file input for replace */}
      {editMode && (
        <input
          ref={fileInputRef}
          type="file"
          accept={`.${ext},image/jpeg,image/png,image/webp`}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      <UnstyledButton
        onClick={onClick}
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--mantine-color-dark-6)',
          aspectRatio: '1',
          display: 'block',
          width: '100%',
          outline: isSelected
            ? '2px solid var(--mantine-color-orange-5)'
            : '2px solid transparent',
          outlineOffset: 2,
          transition: 'transform 100ms ease, box-shadow 100ms ease, outline 80ms ease',
          opacity: isBusy ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {imgError ? (
          <Stack align="center" justify="center" h="100%" gap={4}>
            <IconPhotoOff size={20} style={{ color: 'var(--mantine-color-dimmed)' }} />
          </Stack>
        ) : (
          <img
            src={src}
            alt={image.filename}
            onError={() => setImgError(true)}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}

        {/* Caption badge */}
        <Box style={{ position: 'absolute', bottom: 4, right: 4 }}>
          <Tooltip
            label={image.hasCaption ? 'Has caption' : 'No caption'}
            withArrow
            position="top"
          >
            <ThemeIcon
              size={18}
              radius="xl"
              color={image.hasCaption ? 'teal' : 'gray'}
              variant="filled"
              style={{ opacity: 0.85 }}
            >
              {image.hasCaption
                ? <IconTag size={10} />
                : <IconTagOff size={10} />}
            </ThemeIcon>
          </Tooltip>
        </Box>

        {/* Busy spinner overlay */}
        {isBusy && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)',
            }}
          >
            <Loader size="sm" color="white" />
          </Box>
        )}
      </UnstyledButton>

      {/* Edit mode action overlay (appears on hover) */}
      {showOverlay && (
        <Box
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 2,
          }}
        >
          <Tooltip label="Replace image" withArrow position="right">
            <ThemeIcon
              size={22}
              radius="md"
              color="blue"
              variant="filled"
              style={{ cursor: 'pointer', opacity: 0.9 }}
              onClick={handleReplaceClick}
            >
              <IconRefresh size={12} />
            </ThemeIcon>
          </Tooltip>

          <Tooltip label="Delete image" withArrow position="right">
            <ThemeIcon
              size={22}
              radius="md"
              color="red"
              variant="filled"
              style={{ cursor: 'pointer', opacity: 0.9 }}
              onClick={handleDelete}
            >
              <IconTrash size={12} />
            </ThemeIcon>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}