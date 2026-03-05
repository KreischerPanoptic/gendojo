import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Progress,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconPhoto,
  IconPhotoOff,
  IconPlus,
  IconTag,
  IconTagOff,
  IconUpload,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import {
  datasetsApi,
  useCaption,
  useDataset,
  useUploadDatasetFiles,
  useUpsertCaption,
} from '@services/datasets'
import type { DatasetImage } from '@services/datasets'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'

// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.txt']

// ─────────────────────────────────────────────────────────────────────────────
// ImageThumbnail
// ─────────────────────────────────────────────────────────────────────────────

interface ImageThumbnailProps {
  image: DatasetImage
  datasetName: string
  isSelected: boolean
  onClick: () => void
}

function ImageThumbnail({ image, datasetName, isSelected, onClick }: ImageThumbnailProps) {
  const [imgError, setImgError] = useState(false)
  const src = datasetsApi.getImageUrl(datasetName, image.filename)

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        outline: isSelected ? '2px solid var(--mantine-color-orange-5)' : '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline 80ms ease',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--mantine-color-dark-6)',
        aspectRatio: '1',
        display: 'block',
        width: '100%',
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
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      <Box style={{ position: 'absolute', bottom: 4, right: 4 }}>
        <Tooltip label={image.hasCaption ? 'Has caption' : 'No caption'} withArrow position="top">
          <ThemeIcon size={18} radius="xl" color={image.hasCaption ? 'teal' : 'gray'} variant="filled" style={{ opacity: 0.9 }}>
            {image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}
          </ThemeIcon>
        </Tooltip>
      </Box>
    </UnstyledButton>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CaptionEditor — fetches caption text from API
// ─────────────────────────────────────────────────────────────────────────────

interface CaptionEditorProps {
  image: DatasetImage
  datasetName: string
  onNavigatePrev: (() => void) | null
  onNavigateNext: (() => void) | null
  currentIndex: number
  total: number
}

function CaptionEditor({ image, datasetName, onNavigatePrev, onNavigateNext, currentIndex, total }: CaptionEditorProps) {
  const [localCaption, setLocalCaption] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [imgError, setImgError] = useState(false)

  const upsert = useUpsertCaption(datasetName)
  const src = datasetsApi.getImageUrl(datasetName, image.filename)

  const { data: captionData, isLoading: captionLoading } = useCaption(datasetName, image.filename)

  // Sync when caption loads or image changes
  useEffect(() => {
    if (captionData !== undefined) {
      setLocalCaption(captionData.caption ?? '')
      setIsDirty(false)
    }
  }, [captionData])

  useEffect(() => {
    setImgError(false)
  }, [image.filename])

  const serverCaption = captionData?.caption ?? ''
  const handleChange = (value: string) => {
    setLocalCaption(value)
    setIsDirty(value !== serverCaption)
  }

  const handleSave = async () => {
    await upsert.mutateAsync({ imageName: image.filename, caption: localCaption })
    setIsDirty(false)
    notifications.show({
      title: 'Caption saved',
      message: image.filename,
      color: 'teal',
      icon: <IconCheck size={14} />,
      autoClose: 2000,
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <ActionIcon variant="subtle" disabled={!onNavigatePrev} onClick={onNavigatePrev ?? undefined} size="sm">
            <IconChevronLeft size={14} />
          </ActionIcon>
          <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {currentIndex + 1} / {total}
          </Text>
          <ActionIcon variant="subtle" disabled={!onNavigateNext} onClick={onNavigateNext ?? undefined} size="sm">
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
        <Badge size="xs" color={image.hasCaption ? 'teal' : 'gray'} variant="light"
          leftSection={image.hasCaption ? <IconTag size={10} /> : <IconTagOff size={10} />}>
          {image.hasCaption ? 'captioned' : 'no caption'}
        </Badge>
      </Group>

      <Box style={{ borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden', background: 'var(--mantine-color-dark-6)', aspectRatio: '1', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imgError ? (
          <Stack align="center" gap="xs">
            <IconPhotoOff size={32} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="xs" c="dimmed">Preview unavailable</Text>
          </Stack>
        ) : (
          <img src={src} alt={image.filename} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        )}
      </Box>

      <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={image.filename}>
        {image.filename}
        <Text span c="dimmed" ml={6}>({(image.sizeBytes / 1024).toFixed(0)} KB)</Text>
      </Text>

      <Divider />

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
          onChange={(e) => handleChange(e.currentTarget.value)}
          autosize
          minRows={4}
          maxRows={10}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: '0.8rem' } }}
        />
      )}

      <Button
        leftSection={<IconDeviceFloppy size={15} />}
        disabled={!isDirty || upsert.isPending || captionLoading}
        loading={upsert.isPending}
        onClick={() => void handleSave()}
        variant={isDirty ? 'filled' : 'outline'}
        color={isDirty ? 'orange' : 'gray'}
        size="sm"
      >
        {isDirty ? 'Save Caption' : 'Saved'}
      </Button>

      {upsert.isError && (
        <Alert color="red" icon={<IconAlertCircle size={14} />} p="xs" radius="md">
          <Text size="xs">{(upsert.error as Error).message}</Text>
        </Alert>
      )}
    </Stack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AddFilesDrawer
// ─────────────────────────────────────────────────────────────────────────────

interface AddFilesDrawerProps {
  datasetName: string
  opened: boolean
  onClose: () => void
}

function AddFilesDrawer({ datasetName, opened, onClose }: AddFilesDrawerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const { mutateAsync, uploadState, resetProgress } = useUploadDatasetFiles()

  const handleFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => ALLOWED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext)))
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...valid.filter((f) => !existing.has(f.name))]
    })
  }

  const handleClose = () => { setFiles([]); resetProgress(); onClose() }

  const handleUpload = async () => {
    if (!files.length) return
    await mutateAsync({ name: datasetName, files })
    notifications.show({ title: 'Files added', message: `${files.length} file${files.length > 1 ? 's' : ''} added`, color: 'teal', icon: <IconCheck size={14} /> })
    handleClose()
  }

  return (
    <Drawer opened={opened} onClose={handleClose}
      title={<Group gap="xs"><IconPlus size={16} /><Text fw={600} size="sm">Add files to {datasetName}</Text></Group>}
      position="right" size="sm" padding="lg">
      <Stack gap="md">
        <input ref={inputRef} type="file" accept={ALLOWED_EXTS.join(',')} multiple style={{ display: 'none' }}
          onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />

        <Box
          onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
          onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${isDragging ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-default-border)'}`, borderRadius: 'var(--mantine-radius-md)', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'var(--mantine-color-orange-light)' : 'transparent', transition: 'all 120ms ease' }}
        >
          <Stack align="center" gap="xs">
            <ThemeIcon size={40} variant="light" color={isDragging ? 'orange' : 'gray'} radius="xl"><IconUpload size={18} /></ThemeIcon>
            <Text size="sm" fw={500}>Drop files or click to browse</Text>
            <Text size="xs" c="dimmed">.jpg .png .webp .txt</Text>
          </Stack>
        </Box>

        {files.length > 0 && (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" fw={500}>{files.length} file{files.length > 1 ? 's' : ''} ready</Text>
              <Button size="xs" variant="subtle" color="red" onClick={() => setFiles([])}>Clear</Button>
            </Group>
            <ScrollArea.Autosize mah={200}>
              <Stack gap={2}>
                {files.slice(0, 30).map((f, i) => <Text key={i} size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>{f.name}</Text>)}
                {files.length > 30 && <Text size="xs" c="dimmed">…and {files.length - 30} more</Text>}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        )}

        {uploadState.isUploading && (
          <Stack gap={4}>
            <Group justify="space-between"><Text size="xs" c="dimmed">Uploading…</Text><Text size="xs" fw={500}>{uploadState.progress}%</Text></Group>
            <Progress value={uploadState.progress} color="orange" animated size="sm" radius="xl" />
          </Stack>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={handleClose} disabled={uploadState.isUploading}>Cancel</Button>
          <Button leftSection={<IconUpload size={14} />} disabled={!files.length || uploadState.isUploading} loading={uploadState.isUploading} onClick={() => void handleUpload()}>
            Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : ''}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EditDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function EditDatasetPage() {
  const navigate = useNavigate()
  const { datasetName } = useParams({ from: '/_authenticated/datasets/edit/$datasetName' })
  const { data: dataset, isLoading, isError } = useDataset(datasetName)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [addFilesOpen, setAddFilesOpen] = useState(false)

  useEffect(() => {
    if (dataset && selectedIndex >= dataset.images.length) {
      setSelectedIndex(Math.max(0, dataset.images.length - 1))
    }
  }, [dataset, selectedIndex])

  const selectedImage = dataset?.images[selectedIndex] ?? null

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (!dataset) return
    if (e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setSelectedIndex((i) => Math.min(i + 1, dataset.images.length - 1))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setSelectedIndex((i) => Math.max(i - 1, 0))
  }, [dataset])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  if (isLoading) {
    return (
      <Stack gap="lg" p="lg">
        <Skeleton height={28} width={200} radius="md" />
        <SimpleGrid cols={{ base: 3, sm: 5, md: 6, lg: 8 }} spacing="xs">
          {Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} height={0} style={{ aspectRatio: '1', paddingBottom: '100%' }} radius="md" />)}
        </SimpleGrid>
      </Stack>
    )
  }

  if (isError || !dataset) {
    return (
      <Stack gap="lg" p="lg" maw={480}>
        <Button variant="subtle" leftSection={<IconArrowLeft size={15} />} onClick={() => navigate({ to: '/datasets' })} px={4} size="sm">Back to Datasets</Button>
        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Dataset not found" radius="md">
          Could not load dataset <strong>{datasetName}</strong>.
        </Alert>
      </Stack>
    )
  }

  const captionPercent = Math.round(dataset.captionCoverage * 100)

  return (
    <>
      <AddFilesDrawer datasetName={datasetName} opened={addFilesOpen} onClose={() => setAddFilesOpen(false)} />

      <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
        <Box p="lg" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Group justify="space-between" align="flex-start">
            <Group gap="md" align="center">
              <ActionIcon variant="subtle" onClick={() => navigate({ to: '/datasets' })} size="sm">
                <IconArrowLeft size={15} />
              </ActionIcon>
              <Stack gap={2}>
                <Group gap="sm" align="center">
                  <Title order={3}>{dataset.name}</Title>
                  <Badge variant="light" color="gray" size="sm">{dataset.imageCount} image{dataset.imageCount !== 1 ? 's' : ''}</Badge>
                </Group>
                <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>{dataset.path}</Text>
              </Stack>
            </Group>
            <Group gap="md" align="center">
              <Group gap="xs" align="center">
                <RingProgress size={40} thickness={4} roundCaps sections={[{ value: captionPercent, color: captionPercent === 100 ? 'teal' : 'orange' }]} />
                <Stack gap={0}>
                  <Text size="xs" fw={600}>{captionPercent}%</Text>
                  <Text size="xs" c="dimmed">captioned</Text>
                </Stack>
              </Group>
              <Button variant="outline" size="sm" leftSection={<IconPlus size={14} />} onClick={() => setAddFilesOpen(true)}>Add files</Button>
            </Group>
          </Group>
        </Box>

        {dataset.imageCount === 0 ? (
          <Stack align="center" justify="center" flex={1} gap="md" p="xl">
            <ThemeIcon size={64} variant="light" color="gray" radius="xl"><IconPhoto size={32} /></ThemeIcon>
            <Stack gap={4} align="center">
              <Text fw={500}>No images yet</Text>
              <Text size="sm" c="dimmed">Upload some images to get started</Text>
            </Stack>
            <Button leftSection={<IconUpload size={14} />} onClick={() => setAddFilesOpen(true)}>Add files</Button>
          </Stack>
        ) : (
          <Group gap={0} align="flex-start" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <ScrollArea style={{ flex: 1, height: '100%' }} p="md">
              <SimpleGrid cols={{ base: 3, sm: 4, md: 5, lg: 6, xl: 8 }} spacing="xs">
                {dataset.images.map((image, index) => (
                  <ImageThumbnail key={image.filename} image={image} datasetName={datasetName}
                    isSelected={index === selectedIndex} onClick={() => setSelectedIndex(index)} />
                ))}
              </SimpleGrid>
            </ScrollArea>

            {selectedImage && (
              <>
                <Divider orientation="vertical" />
                <ScrollArea w={320} style={{ flexShrink: 0, height: '100%' }} p="md">
                  <CaptionEditor
                    key={selectedImage.filename}
                    image={selectedImage}
                    datasetName={datasetName}
                    onNavigatePrev={selectedIndex > 0 ? () => setSelectedIndex((i) => i - 1) : null}
                    onNavigateNext={selectedIndex < dataset.images.length - 1 ? () => setSelectedIndex((i) => i + 1) : null}
                    currentIndex={selectedIndex}
                    total={dataset.images.length}
                  />
                </ScrollArea>
              </>
            )}
          </Group>
        )}
      </Stack>
    </>
  )
}