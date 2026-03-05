import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconEye,
  IconFile,
  IconPackage,
  IconPhoto,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { useUploadDatasetFiles, useUploadDatasetZip } from '@services/datasets'
import type { UploadDatasetResponse } from '@services/datasets'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useRef, useState, type DragEvent } from 'react'

// ─────────────────────────────────────────────────────────────────────────────

const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const ALLOWED_FILE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.txt']

function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required'
  if (!NAME_REGEX.test(name))
    return 'Only letters, numbers, hyphens, underscores and dots allowed'
  if (name.includes('..')) return 'Name cannot contain ..'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropzone
// ─────────────────────────────────────────────────────────────────────────────

interface DropzoneProps {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  selectedFiles: File[]
  onClear: () => void
  disabled?: boolean
  label: string
  hint: string
  icon?: React.ReactNode
}

function Dropzone({ accept, multiple, onFiles, selectedFiles, onClear, disabled, label, hint, icon }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) onFiles(Array.from(e.dataTransfer.files))
  }, [disabled, onFiles])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  if (selectedFiles.length > 0) {
    const preview = selectedFiles.slice(0, 6)
    const overflow = selectedFiles.length - preview.length

    return (
      <Paper
        withBorder
        p="md"
        radius="md"
        style={{ borderColor: 'var(--mantine-color-orange-6)', borderStyle: 'solid', borderWidth: 1 }}
      >
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <ThemeIcon color="orange" variant="light" size="sm" radius="xl">
              <IconCheck size={13} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </Text>
            <Badge size="xs" variant="light" color="orange">
              {(selectedFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB
            </Badge>
          </Group>
          <Button size="xs" variant="subtle" color="red" leftSection={<IconX size={11} />} onClick={onClear} disabled={disabled}>
            Clear
          </Button>
        </Group>
        <Stack gap={3}>
          {preview.map((f, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              <IconFile size={12} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
              <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {f.name}
              </Text>
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</Text>
            </Group>
          ))}
          {overflow > 0 && <Text size="xs" c="dimmed" pl={16}>… and {overflow} more</Text>}
        </Stack>
      </Paper>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={handleInputChange} />
      <Paper
        withBorder
        p="xl"
        radius="md"
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        style={{
          borderStyle: 'dashed',
          borderColor: isDragging ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-default-border)',
          background: isDragging ? 'var(--mantine-color-orange-light)' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 120ms ease, background 120ms ease',
          opacity: disabled ? 0.55 : 1,
          userSelect: 'none',
        }}
      >
        <Stack align="center" gap="sm">
          <ThemeIcon size={48} variant="light" color={isDragging ? 'orange' : 'gray'} radius="xl" style={{ transition: 'color 120ms ease' }}>
            {icon ?? <IconUpload size={22} />}
          </ThemeIcon>
          <Stack gap={2} align="center">
            <Text fw={500} size="sm">{label}</Text>
            <Text size="xs" c="dimmed" ta="center" maw={340}>{hint}</Text>
          </Stack>
        </Stack>
      </Paper>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Success state
// ─────────────────────────────────────────────────────────────────────────────

interface SuccessViewProps {
  result: UploadDatasetResponse
  onView: () => void
  onUploadAnother: () => void
}

function SuccessView({ result, onView, onUploadAnother }: SuccessViewProps) {
  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Header — same pattern as View/Edit */}
      <Box p="lg" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group gap="md" align="center">
          <ThemeIcon size={32} radius="xl" color="teal" variant="light">
            <IconCheck size={16} />
          </ThemeIcon>
          <Stack gap={2}>
            <Group gap="sm" align="center">
              <Title order={3}>Upload complete</Title>
              <Badge variant="light" color="teal" size="sm">{result.imageCount} images</Badge>
            </Group>
            <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
              {result.name}
            </Text>
          </Stack>
        </Group>
      </Box>

      {/* Body */}
      <Stack align="center" justify="center" flex={1} gap="xl" p="xl">
        <ThemeIcon size={72} radius="xl" color="teal" variant="light">
          <IconCheck size={36} />
        </ThemeIcon>
        <Stack gap={4} align="center">
          <Text fw={600} size="lg">Dataset <strong>{result.name}</strong> is ready</Text>
          <Text c="dimmed" size="sm">{result.imageCount} images extracted successfully</Text>
        </Stack>
        <Group>
          <Button leftSection={<IconEye size={15} />} onClick={onView}>View Dataset</Button>
          <Button variant="outline" leftSection={<IconUpload size={15} />} onClick={onUploadAnother}>Upload Another</Button>
        </Group>
      </Stack>
    </Stack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadDatasetPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [mode, setMode] = useState<'zip' | 'files'>('zip')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [result, setResult] = useState<UploadDatasetResponse | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const zipMutation = useUploadDatasetZip()
  const filesMutation = useUploadDatasetFiles()

  const isUploading = zipMutation.uploadState.isUploading || filesMutation.uploadState.isUploading
  const progress = mode === 'zip' ? zipMutation.uploadState.progress : filesMutation.uploadState.progress

  const handleNameChange = (value: string) => {
    setName(value)
    if (nameError) setNameError(validateName(value))
  }

  const handleZipFiles = (files: File[]) => {
    const zip = files.find((f) => f.name.toLowerCase().endsWith('.zip'))
    if (zip) setZipFile(zip)
  }

  const handleImageFiles = (files: File[]) => {
    const valid = files.filter((f) => ALLOWED_FILE_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext)))
    setImageFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...valid.filter((f) => !existing.has(f.name))]
    })
  }

  const canUpload = !validateName(name) && (mode === 'zip' ? zipFile !== null : imageFiles.length > 0)

  const handleUpload = async () => {
    const err = validateName(name)
    if (err) { setNameError(err); return }
    setUploadError(null)
    try {
      if (mode === 'zip' && zipFile) {
        const res = await zipMutation.mutateAsync({ name: name.trim(), file: zipFile })
        setResult(res)
      } else if (mode === 'files' && imageFiles.length > 0) {
        const res = await filesMutation.mutateAsync({ name: name.trim(), files: imageFiles })
        setResult(res)
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  const handleReset = () => {
    setResult(null); setZipFile(null); setImageFiles([]); setUploadError(null)
    setName(''); setNameError(null)
    zipMutation.resetProgress(); filesMutation.resetProgress()
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (result) {
    return (
      <SuccessView
        result={result}
        onView={() => navigate({ to: '/datasets/view/' + result.name })}
        onUploadAnother={handleReset}
      />
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>

      {/* Header — same pattern as View/Edit */}
      <Box p="lg" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <ActionIcon variant="subtle" onClick={() => navigate({ to: '/datasets' })} size="sm" disabled={isUploading}>
              <IconArrowLeft size={15} />
            </ActionIcon>
            <Stack gap={2}>
              <Title order={3}>Upload Dataset</Title>
              <Text size="xs" c="dimmed">
                Create a new training dataset from a ZIP archive or individual files
              </Text>
            </Stack>
          </Group>

          {/* Upload action — top right, mirrors "Edit captions" button placement */}
          <Group gap="xs">
            <Button variant="subtle" color="gray" onClick={() => navigate({ to: '/datasets' })} disabled={isUploading} size="sm">
              Cancel
            </Button>
            <Button
              leftSection={<IconUpload size={15} />}
              disabled={!canUpload || isUploading}
              loading={isUploading}
              onClick={() => void handleUpload()}
            >
              {mode === 'zip'
                ? 'Upload & Extract'
                : imageFiles.length > 0
                  ? `Upload ${imageFiles.length} File${imageFiles.length > 1 ? 's' : ''}`
                  : 'Upload Files'}
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Body — scrollable content area */}
      <Box style={{ flex: 1, overflowY: 'auto', display: 'flex', alignSelf: 'center' }} p="lg">
        <Stack gap="lg" maw={560}>

          {/* Dataset name */}
          <TextInput
            label="Dataset name"
            description="Used as the folder name on disk. Letters, numbers, hyphens, underscores."
            placeholder="my_character_v1"
            value={name}
            onChange={(e) => handleNameChange(e.currentTarget.value)}
            onBlur={() => setNameError(validateName(name))}
            error={nameError}
            disabled={isUploading}
            leftSection={<IconPackage size={15} />}
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          />

          {/* Method toggle */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>Upload method</Text>
            <SegmentedControl
              value={mode}
              onChange={(v) => { setMode(v as 'zip' | 'files'); setUploadError(null) }}
              disabled={isUploading}
              data={[
                { label: 'ZIP Archive', value: 'zip' },
                { label: 'Individual Files', value: 'files' },
              ]}
            />
            <Text size="xs" c="dimmed">
              {mode === 'zip'
                ? 'Best for large datasets. Images and captions extracted automatically.'
                : 'Upload images and optional .txt captions directly. Up to 50 files at a time.'}
            </Text>
          </Stack>

          {/* Dropzone */}
          {mode === 'zip' ? (
            <Dropzone
              accept=".zip"
              multiple={false}
              onFiles={handleZipFiles}
              selectedFiles={zipFile ? [zipFile] : []}
              onClear={() => setZipFile(null)}
              disabled={isUploading}
              icon={<IconPackage size={22} />}
              label="Drop your ZIP archive here or click to browse"
              hint="Up to 500 MB. Nested folders are flattened — images land directly in the dataset."
            />
          ) : (
            <Dropzone
              accept={ALLOWED_FILE_EXTS.join(',')}
              multiple
              onFiles={handleImageFiles}
              selectedFiles={imageFiles}
              onClear={() => setImageFiles([])}
              disabled={isUploading}
              icon={<IconPhoto size={22} />}
              label="Drop images here or click to browse"
              hint=".jpg, .jpeg, .png, .webp and .txt captions accepted."
            />
          )}

          {/* Progress */}
          {isUploading && (
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Uploading…</Text>
                <Text size="xs" fw={500}>{progress}%</Text>
              </Group>
              <Progress value={progress} color="orange" animated radius="xl" size="sm" />
            </Stack>
          )}

          {/* Error */}
          {uploadError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Upload failed" radius="md">
              {uploadError}
            </Alert>
          )}

        </Stack>
      </Box>

    </Stack>
  )
}