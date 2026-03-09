import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Loader,
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
  IconArrowLeft,
  IconDownload,
  IconLayersSubtract,
  IconPhoto,
  IconPhotoOff,
} from '@tabler/icons-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'

import { useJob }        from '@services/jobs'
import { useJobOutputs, outputsApi } from '@services/jobs/outputs'
import type { Checkpoint, SamplePrompt } from '@services/jobs/outputs'
import type { ModelArchitecture } from '@services/models'
import { LightboxModal } from '@ui/LightboxModal'
import { makePreviewSidePanel } from '@blocks/SidePanels/PreviewSidePanel'
import type { PreviewMeta } from '@blocks/SidePanels/PreviewSidePanel'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

function checkpointLabel(ckpt: Checkpoint): string {
  if (ckpt.epoch !== undefined) return `Epoch ${ckpt.epoch}`
  if (ckpt.step  !== undefined) return `Step ${ckpt.step.toLocaleString()}`
  return 'Final'
}

function checkpointSubLabel(ckpt: Checkpoint): string {
  const parts: string[] = []
  if (ckpt.previews.length > 0)
    parts.push(`${ckpt.previews.length} preview${ckpt.previews.length !== 1 ? 's' : ''}`)
  parts.push(formatBytes(ckpt.sizeBytes))
  return parts.join(' · ')
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckpointListItem
// ─────────────────────────────────────────────────────────────────────────────

interface CheckpointListItemProps {
  checkpoint: Checkpoint
  jobId: string
  isSelected: boolean
  onSelect: () => void
  onDownload: () => void
  isDownloading: boolean
}

function CheckpointListItem({
  checkpoint,
  jobId,
  isSelected,
  onSelect,
  onDownload,
  isDownloading,
}: CheckpointListItemProps) {
  // Show first preview as thumbnail
  const thumbUrl = checkpoint.previews[0]
    ? outputsApi.getPreviewUrl(jobId, checkpoint.previews[0].filename)
    : null

  return (
    <UnstyledButton
      onClick={onSelect}
      style={{
        display: 'block',
        width: '100%',
        borderRadius: 'var(--mantine-radius-md)',
        border: isSelected
          ? '1px solid var(--mantine-color-blue-5)'
          : '1px solid var(--mantine-color-default-border)',
        background: isSelected
          ? 'var(--mantine-color-blue-light)'
          : 'var(--mantine-color-body)',
        transition: 'border-color 120ms, background 120ms',
      }}
    >
      <Group gap="sm" p="xs" wrap="nowrap" align="center">
        {/* Thumbnail */}
        <Box
          style={{
            width: 52, height: 52, flexShrink: 0,
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
            background: 'var(--mantine-color-dark-6)',
          }}
        >
          {thumbUrl ? (
            <Image src={thumbUrl} w={52} h={52} fit="cover" />
          ) : (
            <ThemeIcon size={52} variant="transparent" color="gray">
              <IconPhotoOff size={20} />
            </ThemeIcon>
          )}
        </Box>

        {/* Labels */}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} truncate>
            {checkpointLabel(checkpoint)}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {checkpointSubLabel(checkpoint)}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace" truncate style={{ fontSize: 10 }}>
            {checkpoint.filename}
          </Text>
        </Stack>

        {/* Download */}
        <Tooltip label="Download checkpoint" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            loading={isDownloading}
            onClick={(e) => { e.stopPropagation(); onDownload() }}
          >
            <IconDownload size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </UnstyledButton>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewGrid — thumbnail grid for a selected checkpoint
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewGridProps {
  checkpoint: Checkpoint
  prompts: SamplePrompt[]
  jobId: string
  arch: string
  onOpenLightbox: (index: number) => void
}

function PreviewGrid({ checkpoint, prompts, jobId, onOpenLightbox }: PreviewGridProps) {
  if (checkpoint.previews.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%" gap="md">
        <ThemeIcon size={56} variant="light" color="gray" radius="xl">
          <IconPhoto size={28} />
        </ThemeIcon>
        <Text size="sm" c="dimmed">No previews for this checkpoint</Text>
      </Stack>
    )
  }

  return (
    <ScrollArea h="100%" p="md">
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing="xs">
        {checkpoint.previews.map((preview, idx) => {
          const url    = outputsApi.getPreviewUrl(jobId, preview.filename)
          const prompt = prompts[preview.promptIndex]
          return (
            <UnstyledButton
              key={preview.filename}
              onClick={() => onOpenLightbox(idx)}
              style={{ display: 'block', borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}
            >
              <Box style={{ position: 'relative', aspectRatio: '1' }}>
                <Image
                  src={url}
                  w="100%" h="100%"
                  fit="cover"
                  radius="md"
                />
                {/* Prompt index badge */}
                {prompt && (
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 4, left: 4,
                    }}
                  >
                    <Badge size="xs" variant="filled" color="dark" style={{ opacity: 0.85 }}>
                      P{preview.promptIndex + 1}
                    </Badge>
                  </Box>
                )}
              </Box>
            </UnstyledButton>
          )
        })}
      </SimpleGrid>
    </ScrollArea>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// JobOutputsPage
// ─────────────────────────────────────────────────────────────────────────────

export default function JobOutputsPage() {
  const { id } = useParams({ from: '/_authenticated/jobs/$id/outputs' })
  const navigate = useNavigate()

  const { data: job }     = useJob(id)
  const { data: outputs, isLoading } = useJobOutputs(id, !!id)

  const [selectedIndex, setSelectedIndex]       = useState(0)
  const [lightboxIndex, setLightboxIndex]       = useState<number | null>(null)
  const [downloadingId, setDownloadingId]       = useState<string | null>(null)

  const checkpoints = outputs?.checkpoints ?? []
  const prompts     = outputs?.prompts     ?? []
  const selected    = checkpoints[selectedIndex] ?? null

  // ── Download handler ────────────────────────────────────────────────────────
  const handleDownload = useCallback(async (ckpt: Checkpoint) => {
    setDownloadingId(ckpt.filename)
    try {
      await outputsApi.downloadCheckpoint(id, ckpt.filename)
    } finally {
      setDownloadingId(null)
    }
  }, [id])

  // ── Lightbox images + metas for selected checkpoint ────────────────────────
  const lightboxImages = useMemo(() => {
    if (!selected) return []
    return selected.previews.map(p => ({
      filename: p.filename,
      url: outputsApi.getPreviewUrl(id, p.filename),
    }))
  }, [selected, id])

  const previewMetas = useMemo<PreviewMeta[]>(() => {
    if (!selected) return []
    return selected.previews.map(p => ({
      epoch:       selected.epoch,
      step:        selected.step,
      promptIndex: p.promptIndex,
    }))
  }, [selected])

  // ── Render ─────────────────────────────────────────────────────────────────

  const arch = (job?.arch ?? 'unknown') as ModelArchitecture

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <LightboxModal
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          renderSidePanel={makePreviewSidePanel({
            metas:              previewMetas,
            prompts,
            arch,
            onClose:            () => setLightboxIndex(null),
            jobId:              id,
            checkpointPreviews: selected?.previews ?? [],
          })}
        />
      )}

      <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <Box
          p="lg" pb="md"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        >
          <Group justify="space-between" align="center">
            <Group gap="md" align="center">
              <ActionIcon
                variant="subtle" size="sm"
                onClick={() => void navigate({ to: '/jobs/$id', params: { id } })}
              >
                <IconArrowLeft size={15} />
              </ActionIcon>

              <Stack gap={2}>
                <Group gap="xs" align="center">
                  <Title order={3} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                    {job?.name ?? id}
                  </Title>
                  {arch && (
                    <Badge variant="outline" color="gray" size="xs">
                      {arch.toUpperCase()}
                    </Badge>
                  )}
                  <Badge variant="light" color="blue" size="xs" leftSection={<IconLayersSubtract size={10} />}>
                    Outputs
                  </Badge>
                </Group>
                {outputs?.outputDir && (
                  <Text size="xs" c="dimmed" ff="monospace">{outputs.outputDir}</Text>
                )}
              </Stack>
            </Group>

            {/* Summary badges */}
            <Group gap="xs">
              {!isLoading && (
                <>
                  <Badge variant="light" color="gray" size="sm">
                    {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
                  </Badge>
                  {prompts.length > 0 && (
                    <Badge variant="light" color="violet" size="sm">
                      {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </>
              )}
            </Group>
          </Group>
        </Box>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <Group align="start" gap={0} style={{ flex: 1, overflow: 'hidden' }}>
            {/* Skeleton list */}
            <Box
              style={{
                width: 280, flexShrink: 0, height: '100%',
                borderRight: '1px solid var(--mantine-color-default-border)',
              }}
              p="sm"
            >
              <Stack gap="xs">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={72} radius="md" />
                ))}
              </Stack>
            </Box>
            <Stack align="center" justify="center" style={{ flex: 1, height: '100%' }} gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading outputs…</Text>
            </Stack>
          </Group>

        ) : checkpoints.length === 0 ? (
          // ── Empty state ───────────────────────────────────────────────────
          <Stack align="center" justify="center" flex={1} gap="md">
            <ThemeIcon size={64} variant="light" color="gray" radius="xl">
              <IconLayersSubtract size={32} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Text fw={500}>No checkpoints yet</Text>
              <Text size="sm" c="dimmed">
                Checkpoints will appear here as training progresses.
              </Text>
            </Stack>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => void navigate({ to: '/jobs/$id', params: { id } })}
            >
              Back to logs
            </Button>
          </Stack>

        ) : (
          // ── Master-detail ─────────────────────────────────────────────────
          <Group align="start" gap={0} style={{ flex: 1, overflow: 'hidden', flexWrap: 'nowrap' }}>

            {/* Left: checkpoint list */}
            <ScrollArea
              style={{
                width: 280, flexShrink: 0, height: '100%',
                borderRight: '1px solid var(--mantine-color-default-border)',
              }}
              p="sm"
            >
              <Stack gap="xs">
                {checkpoints.map((ckpt, idx) => (
                  <CheckpointListItem
                    key={ckpt.filename}
                    checkpoint={ckpt}
                    jobId={id}
                    isSelected={idx === selectedIndex}
                    onSelect={() => {
                      setSelectedIndex(idx)
                      setLightboxIndex(null)
                    }}
                    onDownload={() => void handleDownload(ckpt)}
                    isDownloading={downloadingId === ckpt.filename}
                  />
                ))}
              </Stack>
            </ScrollArea>

            {/* Right: preview grid */}
            <Box style={{ flex: 1, height: '100%', minWidth: 0 }}>
              {selected ? (
                <>
                  {/* Sub-header: selected checkpoint info */}
                  <Box
                    px="md" py="xs"
                    style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
                  >
                    <Group gap="xs" align="center">
                      <Text size="sm" fw={600}>{checkpointLabel(selected)}</Text>
                      <Text size="xs" c="dimmed">·</Text>
                      <Text size="xs" c="dimmed" ff="monospace">{selected.filename}</Text>
                      <Text size="xs" c="dimmed">·</Text>
                      <Text size="xs" c="dimmed">{formatBytes(selected.sizeBytes)}</Text>
                      <Box style={{ flex: 1 }} />
                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        leftSection={<IconDownload size={12} />}
                        loading={downloadingId === selected.filename}
                        onClick={() => void handleDownload(selected)}
                      >
                        Download
                      </Button>
                    </Group>
                  </Box>

                  <Box style={{ height: 'calc(100% - 41px)' }}>
                    <PreviewGrid
                      checkpoint={selected}
                      prompts={prompts}
                      jobId={id}
                      arch={arch}
                      onOpenLightbox={setLightboxIndex}
                    />
                  </Box>
                </>
              ) : (
                <Stack align="center" justify="center" h="100%" gap="xs">
                  <Text size="sm" c="dimmed">Select a checkpoint</Text>
                </Stack>
              )}
            </Box>
          </Group>
        )}
      </Stack>
    </>
  )
}