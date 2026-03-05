import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Kbd,
  Modal,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconPhoto,
  IconPhotoOff,
  IconTag,
  IconTagOff,
  IconX,
} from '@tabler/icons-react'
import { datasetsApi, useCaption, useDataset } from '@services/datasets'
import type { DatasetImage } from '@services/datasets'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ImageCard — thumbnail in the grid
// ─────────────────────────────────────────────────────────────────────────────

interface ImageCardProps {
  image: DatasetImage
  datasetName: string
  onClick: () => void
}

function ImageCard({ image, datasetName, onClick }: ImageCardProps) {
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
        transition: 'transform 100ms ease, box-shadow 100ms ease',
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
          <ThemeIcon size={18} radius="xl" color={image.hasCaption ? 'teal' : 'gray'} variant="filled" style={{ opacity: 0.85 }}>
            {image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}
          </ThemeIcon>
        </Tooltip>
      </Box>
    </UnstyledButton>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LightboxModal — full image + caption, prev/next nav
// ─────────────────────────────────────────────────────────────────────────────

interface LightboxModalProps {
  images: DatasetImage[]
  index: number
  datasetName: string
  onClose: () => void
  onNavigate: (index: number) => void
  onEdit: () => void
}

function LightboxModal({ images, index, datasetName, onClose, onNavigate, onEdit }: LightboxModalProps) {
  const image = images[index]
  const [imgError, setImgError] = useState(false)

  const src = datasetsApi.getImageUrl(datasetName, image.filename)
  const { data: captionData, isLoading: captionLoading } = useCaption(datasetName, image.filename)

  // Reset on image change
  useEffect(() => {
    setImgError(false)
  }, [image.filename])

  // Keyboard nav inside modal
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

        {/* ── Image side ── */}
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
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}

          {/* Prev button */}
          {index > 0 && (
            <ActionIcon
              variant="filled"
              color="dark"
              size="lg"
              radius="xl"
              onClick={() => onNavigate(index - 1)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
          )}

          {/* Next button */}
          {index < images.length - 1 && (
            <ActionIcon
              variant="filled"
              color="dark"
              size="lg"
              radius="xl"
              onClick={() => onNavigate(index + 1)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          )}

          {/* Counter */}
          <Box style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
            <Badge variant="filled" color="dark" size="sm" style={{ opacity: 0.75 }}>
              {index + 1} / {images.length}
            </Badge>
          </Box>
        </Box>

        {/* ── Info side ── */}
        <Box w={280} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--mantine-color-default-border)' }}>
          {/* Header */}
          <Group justify="space-between" p="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <Text size="sm" fw={600} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {image.filename}
            </Text>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          </Group>

          {/* Details */}
          <ScrollArea style={{ flex: 1 }} p="md">
            <Stack gap="md">
              <Group gap="xs">
                <Badge size="xs" color={image.hasCaption ? 'teal' : 'gray'} variant="light"
                  leftSection={image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}>
                  {image.hasCaption ? 'captioned' : 'no caption'}
                </Badge>
                <Badge size="xs" color="gray" variant="outline">
                  {(image.sizeBytes / 1024).toFixed(0)} KB
                </Badge>
              </Group>

              <Divider />

              <Stack gap={6}>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>Caption</Text>
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
                      color: 'var(--mantine-color-text)',
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

          {/* Footer */}
          <Box p="md" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Stack gap="xs">
              <Button
                fullWidth
                variant="light"
                leftSection={<IconEdit size={14} />}
                size="sm"
                onClick={onEdit}
              >
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

// ─────────────────────────────────────────────────────────────────────────────
// ViewDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewDatasetPage() {
  const navigate = useNavigate()
  const { datasetName } = useParams({ from: '/_authenticated/datasets/view/$datasetName' })
  const { data: dataset, isLoading, isError } = useDataset(datasetName)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Keyboard: open lightbox with Enter on focused grid item, close with Escape
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && lightboxIndex !== null) setLightboxIndex(null)
  }, [lightboxIndex])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Stack gap="lg" p="lg">
        <Skeleton height={28} width={220} radius="md" />
        <SimpleGrid cols={{ base: 3, sm: 4, md: 5, lg: 6, xl: 8 }} spacing="xs">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} height={0} style={{ aspectRatio: '1', paddingBottom: '100%' }} radius="md" />
          ))}
        </SimpleGrid>
      </Stack>
    )
  }

  if (isError || !dataset) {
    return (
      <Stack gap="lg" p="lg" maw={480}>
        <Button variant="subtle" leftSection={<IconArrowLeft size={15} />}
          onClick={() => navigate({ to: '/datasets' })} px={4} size="sm">
          Back to Datasets
        </Button>
        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Dataset not found" radius="md">
          Could not load dataset <strong>{datasetName}</strong>.
        </Alert>
      </Stack>
    )
  }

  const captionPercent = Math.round(dataset.captionCoverage * 100)

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && dataset.images.length > 0 && (
        <LightboxModal
          images={dataset.images}
          index={lightboxIndex}
          datasetName={datasetName}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onEdit={() => {
            setLightboxIndex(null)
            navigate({ to: '/datasets/edit/' + datasetName })
          }}
        />
      )}

      <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>

        {/* Header */}
        <Box p="lg" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Group justify="space-between" align="flex-start">
            <Group gap="md" align="center">
              <ActionIcon variant="subtle" onClick={() => navigate({ to: '/datasets' })} size="sm">
                <IconArrowLeft size={15} />
              </ActionIcon>
              <Stack gap={2}>
                <Group gap="sm" align="center">
                  <Title order={3}>{dataset.name}</Title>
                  <Badge variant="light" color="gray" size="sm">
                    {dataset.imageCount} image{dataset.imageCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="light" color={captionPercent === 100 ? 'teal' : 'orange'} size="sm">
                    {captionPercent}% captioned
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
                  {dataset.path}
                </Text>
              </Stack>
            </Group>

            <Group gap="md" align="center">
              <Group gap="xs" align="center">
                <RingProgress
                  size={40}
                  thickness={4}
                  roundCaps
                  sections={[{ value: captionPercent, color: captionPercent === 100 ? 'teal' : 'orange' }]}
                />
                <Stack gap={0}>
                  <Text size="xs" fw={600}>{dataset.captionedCount} / {dataset.imageCount}</Text>
                  <Text size="xs" c="dimmed">with captions</Text>
                </Stack>
              </Group>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconEdit size={14} />}
                onClick={() => navigate({ to: '/datasets/edit/' + datasetName })}
              >
                Edit captions
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Gallery */}
        {dataset.imageCount === 0 ? (
          <Stack align="center" justify="center" flex={1} gap="md" p="xl">
            <ThemeIcon size={64} variant="light" color="gray" radius="xl">
              <IconPhoto size={32} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Text fw={500}>No images</Text>
              <Text size="sm" c="dimmed">This dataset is empty</Text>
            </Stack>
          </Stack>
        ) : (
          <ScrollArea style={{ flex: 1 }} p="md">
            <SimpleGrid cols={{ base: 3, sm: 4, md: 5, lg: 6, xl: 8 }} spacing="xs">
              {dataset.images.map((image, index) => (
                <ImageCard
                  key={image.filename}
                  image={image}
                  datasetName={datasetName}
                  onClick={() => setLightboxIndex(index)}
                />
              ))}
            </SimpleGrid>
          </ScrollArea>
        )}
      </Stack>
    </>
  )
}