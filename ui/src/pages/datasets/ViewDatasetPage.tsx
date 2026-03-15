import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  RingProgress,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconEdit,
  IconPhoto,
  IconScan,
  IconTag,
} from '@tabler/icons-react'
import {
  datasetsApi,
  useDataset,
  useDetectCaptionType,
  useUpdateMeta,
  type CaptionType,
  type DatasetMeta,
  type UpdateMeta,
} from '@services/datasets'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LightboxModal } from '@ui/LightboxModal'
import { makeDatasetSidePanel } from '@blocks/SidePanels/DatasetSidePanel'
import { DatasetImageGrid } from '@layouts/DatasetImageGrid'

// ─────────────────────────────────────────────────────────────────────────────
// MetaCard — inline-editable dataset metadata
// ─────────────────────────────────────────────────────────────────────────────

const CAPTION_TYPE_OPTIONS: { value: CaptionType; label: string }[] = [
  { value: 'tag_list',         label: 'Tag list' },
  { value: 'natural_language', label: 'Natural language' },
  { value: 'mixed',            label: 'Mixed' },
  { value: 'unknown',          label: 'Unknown' },
]

interface MetaCardProps {
  datasetName: string
  meta: DatasetMeta | null
}

function MetaCard({ datasetName, meta }: MetaCardProps) {
  const updateMeta     = useUpdateMeta(datasetName)
  const detectType     = useDetectCaptionType(datasetName)

  // Local state for inline edits — flush on blur
  const [token, setToken]   = useState(meta?.activationToken ?? '')
  const [notes, setNotes]   = useState(meta?.notes ?? '')

  // Keep local state in sync when meta changes (e.g. after detect)
  const [prevMeta, setPrevMeta] = useState(meta)
  if (prevMeta !== meta) {
    setPrevMeta(meta)
    setToken(meta?.activationToken ?? '')
    setNotes(meta?.notes ?? '')
  }

  const saveField = (field: UpdateMeta) =>
    updateMeta.mutate(field, {
      onSuccess: () =>
        notifications.show({
          message: 'Metadata saved',
          color: 'teal',
          icon: <IconCheck size={14} />,
          autoClose: 1500,
        }),
    })

  const handleDetect = () =>
    detectType.mutate(undefined, {
      onSuccess: (result) =>
        notifications.show({
          title: 'Caption type detected',
          message: `${result.captionType} (${result.sampleSize} sampled, ${Math.round(result.tagListRatio * 100)}% tag-like)`,
          color: 'teal',
          autoClose: 4000,
        }),
    })

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconTag size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
          <Text size="sm" fw={600}>Dataset metadata</Text>
        </Group>
        <Tooltip label="Auto-detect caption type from file contents" withArrow>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconScan size={12} />}
            loading={detectType.isPending}
            onClick={handleDetect}
          >
            Detect type
          </Button>
        </Tooltip>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        {/* Activation token */}
        <TextInput
          label="Activation token"
          placeholder="my_char"
          size="xs"
          value={token}
          onChange={(e) => setToken(e.currentTarget.value)}
          onBlur={() => saveField({ activationToken: token.trim() || null })}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
        />

        {/* Caption type */}
        <Select
          label="Caption type"
          size="xs"
          data={CAPTION_TYPE_OPTIONS}
          value={meta?.captionType ?? 'unknown'}
          onChange={(val) => val && saveField({ captionType: val as CaptionType })}
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          placeholder="Optional notes about this dataset…"
          size="xs"
          minRows={1}
          maxRows={3}
          autosize
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          onBlur={() => saveField({ notes })}
        />
      </SimpleGrid>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewDatasetPage() {
  const navigate = useNavigate()
  const { datasetName } = useParams({
    from: '/_authenticated/datasets/view/$datasetName',
  })
  const { data: dataset, isLoading, isError } = useDataset(datasetName)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIndex !== null) setLightboxIndex(null)
    },
    [lightboxIndex],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  const lightboxImages = useMemo(
    () =>
      dataset?.images.map((img) => ({
        filename: img.filename,
        url: datasetsApi.getImageUrl(datasetName, img.filename),
      })) ?? [],
    [dataset?.images, datasetName],
  )

  const handleEdit = useCallback(() => {
    const filename =
      lightboxIndex !== null
        ? dataset?.images[lightboxIndex]?.filename
        : undefined
    setLightboxIndex(null)
    navigate({
      to: '/datasets/edit/$datasetName',
      params: { datasetName },
      search: filename ? { filename } : { filename: undefined },
    })
  }, [lightboxIndex, dataset?.images, datasetName, navigate])

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Stack gap="lg" p="lg">
        <Skeleton height={28} width={220} radius="md" />
        <Skeleton height={80} radius="md" />
        <SimpleGrid cols={{ base: 3, sm: 4, md: 5, lg: 6, xl: 8 }} spacing="xs">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton
              key={i}
              height={0}
              style={{ aspectRatio: '1', paddingBottom: '100%' }}
              radius="md"
            />
          ))}
        </SimpleGrid>
      </Stack>
    )
  }

  if (isError || !dataset) {
    return (
      <Stack gap="lg" p="lg" maw={480}>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={15} />}
          onClick={() => navigate({ to: '/datasets' })}
          px={4}
          size="sm"
        >
          Back to Datasets
        </Button>
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Dataset not found"
          radius="md"
        >
          Could not load dataset <strong>{datasetName}</strong>.
        </Alert>
      </Stack>
    )
  }

  const captionPercent = Math.round(dataset.captionCoverage * 100)
  const cls = dataset.captionLengthSummary

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <LightboxModal
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          renderSidePanel={makeDatasetSidePanel({
            datasetImages: dataset.images,
            datasetName,
            onClose: () => setLightboxIndex(null),
            onEdit: handleEdit,
          })}
        />
      )}

      <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Box
          p="lg"
          pb="md"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group justify="space-between" align="flex-start">
            <Group gap="md" align="center">
              <ActionIcon
                variant="subtle"
                onClick={() => navigate({ to: '/datasets' })}
                size="sm"
              >
                <IconArrowLeft size={15} />
              </ActionIcon>
              <Stack gap={2}>
                <Group gap="sm" align="center">
                  <Title order={3}>{dataset.name}</Title>
                  <Badge variant="light" color="gray" size="sm">
                    {dataset.imageCount} image{dataset.imageCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge
                    variant="light"
                    color={captionPercent === 100 ? 'teal' : 'orange'}
                    size="sm"
                  >
                    {captionPercent}% captioned
                  </Badge>
                </Group>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}
                >
                  {dataset.path}
                </Text>
              </Stack>
            </Group>

            <Group gap="sm" align="center">
              <RingProgress
                size={40}
                thickness={4}
                roundCaps
                sections={[
                  {
                    value: captionPercent,
                    color: captionPercent === 100 ? 'teal' : 'orange',
                  },
                ]}
              />
              <Stack gap={0}>
                <Text size="xs" fw={600}>
                  {dataset.captionedCount} / {dataset.imageCount}
                </Text>
                <Text size="xs" c="dimmed">with captions</Text>
              </Stack>

              <Tooltip label="Download dataset as zip" withArrow>
                <ActionIcon
                  variant="subtle"
                  component="a"
                  href={datasetsApi.getExportUrl(datasetName)}
                  download
                  size="md"
                >
                  <IconDownload size={16} />
                </ActionIcon>
              </Tooltip>

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

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <Box style={{ flex: 1, overflowY: 'auto' }}>
          <Stack gap="md" p="lg">

            {/* Meta card */}
            <MetaCard datasetName={datasetName} meta={dataset.meta} />

            {/* Caption length warnings */}
            {cls && (cls.longForClipCount > 0 || cls.longForT5Count > 0) && (
              <Card withBorder radius="md" p="sm">
                <Group gap="xs" wrap="wrap">
                  <IconAlertTriangle
                    size={14}
                    style={{ color: 'var(--mantine-color-orange-5)' }}
                  />
                  <Text size="xs" fw={600} c="orange.5">Caption length warnings</Text>
                  <Divider orientation="vertical" />
                  <Text size="xs" c="dimmed">
                    avg {cls.avgCharCount} chars · avg {cls.avgWordCount} words
                  </Text>

                  {cls.longForClipCount > 0 && (
                    <Tooltip
                      label="These captions likely exceed 77 CLIP tokens and may be truncated for SD 1/2/SDXL training."
                      multiline
                      maw={280}
                      withArrow
                    >
                      <Badge
                        size="xs"
                        color="orange"
                        variant="light"
                        style={{ cursor: 'default' }}
                      >
                        {cls.longForClipCount} long for CLIP
                      </Badge>
                    </Tooltip>
                  )}

                  {cls.longForT5Count > 0 && (
                    <Tooltip
                      label="These captions likely exceed 256 T5 tokens and may be truncated for FLUX / SD3 / Hunyuan training."
                      multiline
                      maw={280}
                      withArrow
                    >
                      <Badge
                        size="xs"
                        color="yellow"
                        variant="light"
                        style={{ cursor: 'default' }}
                      >
                        {cls.longForT5Count} long for T5
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
              </Card>
            )}

            {/* Gallery */}
            {dataset.imageCount === 0 ? (
              <Stack align="center" justify="center" gap="md" py="xl">
                <ThemeIcon size={64} variant="light" color="gray" radius="xl">
                  <IconPhoto size={32} />
                </ThemeIcon>
                <Stack gap={4} align="center">
                  <Text fw={500}>No images</Text>
                  <Text size="sm" c="dimmed">This dataset is empty</Text>
                </Stack>
              </Stack>
            ) : (
              <DatasetImageGrid
                images={dataset.images}
                datasetName={datasetName}
                onImageClick={setLightboxIndex}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </>
  )
}