import {
  Badge,
  Button,
  Divider,
  Group,
  Kbd,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import {
  IconEdit,
  IconTag,
  IconTagOff,
} from '@tabler/icons-react'
import { useCaption, type DatasetImage } from '@services/datasets'
import { LightboxSidePanel, type LightboxImage, type ImageDimensions } from '@ui/LightboxModal'

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

export interface DatasetSidePanelProps {
  image: LightboxImage
  /** Original DatasetImage — needed for hasCaption / sizeBytes */
  datasetImage: DatasetImage
  datasetName: string
  dimensions: ImageDimensions | null
  onClose: () => void
  onEdit: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DatasetSidePanel({
  image,
  datasetImage,
  datasetName,
  dimensions,
  onClose,
  onEdit,
}: DatasetSidePanelProps) {
  const { data: captionData, isLoading: captionLoading } = useCaption(datasetName, image.filename)

  const footer = (
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
  )

  return (
    <LightboxSidePanel image={image} onClose={onClose} footer={footer}>
      <Stack gap="md">
        {/* Badges row */}
        <Group gap="xs">
          <Badge
            size="xs" variant="light"
            color={datasetImage.hasCaption ? 'teal' : 'gray'}
            leftSection={datasetImage.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}
          >
            {datasetImage.hasCaption ? 'captioned' : 'no caption'}
          </Badge>
          <Badge size="xs" color="gray" variant="outline">
            {(datasetImage.sizeBytes / 1024).toFixed(0)} KB
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

        {/* Caption */}
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
    </LightboxSidePanel>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// renderSidePanel factory — use this in dataset lightbox consumers:
//
//   renderSidePanel={makeDatasetSidePanel({ datasetImages, datasetName, onClose, onEdit })}
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetSidePanelFactoryOptions {
  datasetImages: DatasetImage[]
  datasetName: string
  onClose: () => void
  onEdit: () => void
}

export function makeDatasetSidePanel({
  datasetImages,
  datasetName,
  onClose,
  onEdit,
}: DatasetSidePanelFactoryOptions) {
  return (image: LightboxImage, index: number, dimensions: ImageDimensions | null) => (
    <DatasetSidePanel
      key={image.filename}
      image={image}
      datasetImage={datasetImages[index]}
      datasetName={datasetName}
      dimensions={dimensions}
      onClose={onClose}
      onEdit={onEdit}
    />
  )
}