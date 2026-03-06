import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Kbd,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import { datasetsApi, useCaption, type DatasetImage } from '@services/datasets'
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconPhotoOff,
  IconTag,
  IconTagOff,
  IconX,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function aspectRatio(w: number, h: number): string {
  if (w === 0 || h === 0) return '—'
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface LightboxModalProps {
  images: DatasetImage[]
  index: number
  datasetName: string
  onClose: () => void
  onNavigate: (index: number) => void
  onEdit: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function LightboxModal({ images, index, datasetName, onClose, onNavigate, onEdit }: LightboxModalProps) {
  const image = images[index]
  const [imgError, setImgError] = useState(false)
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null)

  // ── Reset per-image UI state (adjust-state-during-render) ─────────────────
  const [prevFilename, setPrevFilename] = useState(image.filename)
  if (prevFilename !== image.filename) {
    setPrevFilename(image.filename)
    setImgError(false)
    setDimensions(null)
  }

  const src = datasetsApi.getImageUrl(datasetName, image.filename)
  const { data: captionData, isLoading: captionLoading } = useCaption(datasetName, image.filename)

  // Keyboard nav — this is a genuine external subscription, useEffect is correct here
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

        {/* ── Image side ─────────────────────────────────────────────────── */}
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
          }}
        >
          {imgError ? (
            <Stack align="center" gap="sm">
              <IconPhotoOff size={48} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Text size="sm" c="dimmed">Preview unavailable</Text>
            </Stack>
          ) : (
            <img
              src={src}
              alt={image.filename}
              onError={() => setImgError(true)}
              onLoad={(e) => {
                const el = e.currentTarget
                setDimensions({ w: el.naturalWidth, h: el.naturalHeight })
              }}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}

          {index > 0 && (
            <ActionIcon
              variant="filled" color="dark" size="lg" radius="xl"
              onClick={() => onNavigate(index - 1)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
          )}
          {index < images.length - 1 && (
            <ActionIcon
              variant="filled" color="dark" size="lg" radius="xl"
              onClick={() => onNavigate(index + 1)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          )}

          <Box style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
            <Badge variant="filled" color="dark" size="sm" style={{ opacity: 0.75 }}>
              {index + 1} / {images.length}
            </Badge>
          </Box>
        </Box>

        {/* ── Info side ──────────────────────────────────────────────────── */}
        <Box
          w={280}
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Group
            justify="space-between" p="md" pb="xs"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text
              size="sm" fw={600}
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
            >
              {image.filename}
            </Text>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          </Group>

          <ScrollArea style={{ flex: 1 }} p="md">
            <Stack gap="md">
              <Group gap="xs">
                <Badge
                  size="xs" variant="light"
                  color={image.hasCaption ? 'teal' : 'gray'}
                  leftSection={image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}
                >
                  {image.hasCaption ? 'captioned' : 'no caption'}
                </Badge>
                <Badge size="xs" color="gray" variant="outline">
                  {(image.sizeBytes / 1024).toFixed(0)} KB
                </Badge>
                {dimensions && (
                  <>
                    <Badge size="xs" color="gray" variant="outline">
                      {dimensions.w}×{dimensions.h}
                    </Badge>
                    <Badge size="xs" color="gray" variant="outline">
                      {aspectRatio(dimensions.w, dimensions.h)}
                    </Badge>
                  </>
                )}
              </Group>

              <Divider />

              <Stack gap={6}>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
                  Caption
                </Text>
                {captionLoading ? (
                  <Stack gap={4}>
                    <Skeleton height={10} radius="sm" />
                    <Skeleton height={10} width="80%" radius="sm" />
                    <Skeleton height={10} width="60%" radius="sm" />
                  </Stack>
                ) : captionData?.caption ? (
                  <Text
                    size="sm"
                    style={{
                      fontFamily: 'var(--mantine-font-family-monospace)',
                      fontSize: '0.78rem',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {captionData.caption}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed" fs="italic">No caption yet</Text>
                )}
              </Stack>
            </Stack>
          </ScrollArea>

          <Box p="md" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Stack gap="xs">
              <Button fullWidth variant="light" leftSection={<IconEdit size={14} />} size="sm" onClick={onEdit}>
                Edit captions
              </Button>
              <Group gap={4} justify="center">
                <Kbd size="xs">←</Kbd>
                <Kbd size="xs">→</Kbd>
                <Text size="xs" c="dimmed">navigate</Text>
                <Text size="xs" c="dimmed" mx={4}>·</Text>
                <Kbd size="xs">Esc</Kbd>
                <Text size="xs" c="dimmed">close</Text>
              </Group>
            </Stack>
          </Box>
        </Box>

      </Group>
    </Modal>
  )
}