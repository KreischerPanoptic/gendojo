import { Box, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconPhotoOff } from '@tabler/icons-react'
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// PreviewCard — thumbnail for the outputs/checkpoints preview grid.
//
// Intentionally lean — no caption badge, no dataset coupling.
// Label (e.g. "prompt 2") renders below the image as a subtle caption.
//
// Used in: JobOutputsPage checkpoint preview grid
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewCardProps {
  /** Fully-resolved image URL */
  url: string
  /** Alt text + fallback label */
  filename: string
  /** Short label rendered below the thumbnail, e.g. "prompt 2" */
  label?: string
  onClick: () => void
  isSelected?: boolean
}

export function PreviewCard({
  url,
  filename,
  label,
  onClick,
  isSelected = false,
}: PreviewCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <Stack gap={4}>
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
            ? '2px solid var(--mantine-color-blue-5)'
            : '2px solid transparent',
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
            src={url}
            alt={filename}
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

        {/* Subtle gradient overlay so label is readable on any background */}
        {!imgError && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 40%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </UnstyledButton>

      {/* Label below card — prompt index or custom string */}
      {label && (
        <Text
          size="xs"
          c="dimmed"
          ta="center"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Text>
      )}
    </Stack>
  )
}