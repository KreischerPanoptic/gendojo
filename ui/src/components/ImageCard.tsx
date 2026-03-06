import { Box, Stack, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core'
import { IconPhotoOff, IconTag, IconTagOff } from '@tabler/icons-react'
import { datasetsApi } from '@services/datasets'
import type { DatasetImage } from '@services/datasets'
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ImageCard — shared thumbnail for dataset grids
//
// Used in:
//   • ViewDatasetPage  — gallery viewer (no selection)
//   • EditDatasetPage  — caption editor (with selection outline)
//   • (future) outputs browser, GenUI results grid
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageCardProps {
  image: DatasetImage
  datasetName: string
  onClick: () => void
  /** Renders an orange selection outline. Used in editor grids. */
  isSelected?: boolean
}

export function ImageCard({ image, datasetName, onClick, isSelected = false }: ImageCardProps) {
  const [imgError, setImgError] = useState(false)
  const src = datasetsApi.getImageUrl(datasetName, image.filename)

  return (
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
        outline: isSelected ? '2px solid var(--mantine-color-orange-5)' : '2px solid transparent',
        outlineOffset: 2,
        transition: 'transform 100ms ease, box-shadow 100ms ease, outline 80ms ease',
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
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Caption badge */}
      <Box style={{ position: 'absolute', bottom: 4, right: 4 }}>
        <Tooltip label={image.hasCaption ? 'Has caption' : 'No caption'} withArrow position="top">
          <ThemeIcon
            size={18}
            radius="xl"
            color={image.hasCaption ? 'teal' : 'gray'}
            variant="filled"
            style={{ opacity: 0.85 }}
          >
            {image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}
          </ThemeIcon>
        </Tooltip>
      </Box>
    </UnstyledButton>
  )
}