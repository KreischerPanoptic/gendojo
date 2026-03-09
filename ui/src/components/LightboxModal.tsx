import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Modal,
  Stack,
  Text,
} from '@mantine/core'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhotoOff,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Generic image type — used by all LightboxModal consumers.
//
// Dataset mode:  map DatasetImage → LightboxImage via datasetsApi.getImageUrl()
// Preview mode:  url comes from /jobs/:id/outputs/previews/:filename
// ─────────────────────────────────────────────────────────────────────────────

export interface LightboxImage {
  /** Stable key — filename or any unique id */
  filename: string
  /** Fully-resolved URL ready to put in <img src> */
  url: string
  /** Optional label shown in the counter badge (e.g. "epoch 4 · prompt 2") */
  label?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimensions — passed to renderSidePanel so panels can show w×h / aspect ratio
// without duplicating the onLoad logic.
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageDimensions {
  w: number
  h: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface LightboxModalProps {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
  /**
   * Renders the full right panel for the current image.
   * Receives the current image, its index, and resolved dimensions (null until loaded).
   *
   * Use <LightboxSidePanel> for consistent chrome (header with filename + X,
   * scrollable content, optional footer).
   */
  renderSidePanel: (
    image: LightboxImage,
    index: number,
    dimensions: ImageDimensions | null,
  ) => React.ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// LightboxModal
// ─────────────────────────────────────────────────────────────────────────────

export function LightboxModal({
  images,
  index,
  onClose,
  onNavigate,
  renderSidePanel,
}: LightboxModalProps) {
  const image = images[index]
  const [imgError, setImgError] = useState(false)
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null)

  // Reset per-image state when image changes (adjust-state-during-render pattern)
  const [prevFilename, setPrevFilename] = useState(image.filename)
  if (prevFilename !== image.filename) {
    setPrevFilename(image.filename)
    setImgError(false)
    setDimensions(null)
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNavigate(Math.min(index + 1, images.length - 1))
      else if (e.key === 'ArrowLeft') onNavigate(Math.max(index - 1, 0))
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, images.length, onNavigate, onClose])

  return (
    <Modal
      opened
      onClose={onClose}
      size="xl"
      padding={0}
      withCloseButton={false}
      radius="md"
      overlayProps={{ blur: 4, backgroundOpacity: 0.7 }}
      styles={{ body: { padding: 0 } }}
    >
      <Group gap={0} align="stretch" style={{ minHeight: 500, maxHeight: '80vh' }}>

        {/* ── Image pane ───────────────────────────────────────────────────── */}
        <Box
          style={{
            flex: 1,
            background: '#0d0d0d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            maxHeight: '80vh',
          }}
        >
          {imgError ? (
            <Stack align="center" gap="sm">
              <IconPhotoOff size={48} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Text size="sm" c="dimmed">Preview unavailable</Text>
            </Stack>
          ) : (
            <img
              src={image.url}
              alt={image.filename}
              onError={() => setImgError(true)}
              onLoad={(e) => {
                const el = e.currentTarget
                setDimensions({ w: el.naturalWidth, h: el.naturalHeight })
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}

          {index > 0 && (
            <ActionIcon
              variant="filled" color="dark" size="lg" radius="xl"
              onClick={() => onNavigate(index - 1)}
              style={{
                position: 'absolute', left: 12,
                top: '50%', transform: 'translateY(-50%)', opacity: 0.8,
              }}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
          )}

          {index < images.length - 1 && (
            <ActionIcon
              variant="filled" color="dark" size="lg" radius="xl"
              onClick={() => onNavigate(index + 1)}
              style={{
                position: 'absolute', right: 12,
                top: '50%', transform: 'translateY(-50%)', opacity: 0.8,
              }}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          )}

          {/* Counter badge — shows label if provided, otherwise "N / total" */}
          <Box style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
            <Badge variant="filled" color="dark" size="sm" style={{ opacity: 0.75 }}>
              {image.label ?? `${index + 1} / ${images.length}`}
            </Badge>
          </Box>
        </Box>

        {/* ── Side panel — fully owned by the render prop ──────────────────── */}
        <Box
          w={280}
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--mantine-color-default-border)',
            overflow: 'hidden',
          }}
        >
          {renderSidePanel(image, index, dimensions)}
        </Box>

      </Group>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LightboxSidePanel — layout helper for renderSidePanel implementations.
//
// Provides consistent chrome:
//   • Header  — filename (truncated) + X close button
//   • Content — flex-1 scrollable area (pass as children)
//   • Footer  — optional, e.g. action buttons + keyboard hints
//
// Usage:
//   renderSidePanel={(image, _i, dims) => (
//     <LightboxSidePanel image={image} onClose={onClose} footer={<MyFooter />}>
//       <MyPanelContent dims={dims} />
//     </LightboxSidePanel>
//   )}
// ─────────────────────────────────────────────────────────────────────────────

export interface LightboxSidePanelProps {
  image: LightboxImage
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export function LightboxSidePanel({
  image,
  onClose,
  children,
  footer,
}: LightboxSidePanelProps) {
  return (
    <>
      {/* Header */}
      <Group
        justify="space-between"
        p="md"
        pb="xs"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Text
          size="sm" fw={600}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {image.filename}
        </Text>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose}>
          {/* inline SVG to avoid extra import in this helper */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </ActionIcon>
      </Group>

      {/* Scrollable content */}
      <Box style={{ flex: 1, overflowY: 'auto', padding: 'var(--mantine-spacing-md)' }}>
        {children}
      </Box>

      {/* Optional footer */}
      {footer && (
        <Box
          p="md"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        >
          {footer}
        </Box>
      )}
    </>
  )
}