import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Progress,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  useCancelDownload,
  useDownloadJobs,
  useDownloaderPresets,
  useStartDownload,
  type DownloadJob,
  type ModelPreset,
  type StartDownloadRequest,
  STATUS_COLOR,
  STATUS_LABEL,
  formatBytes,
} from '@services/models/downloader'
import {
  ARCH_COLOR,
  ARCH_LABEL,
  ROLE_LABEL,
  useModels,
  type ModelArchitecture,
  type ModelRole,
} from '@services/models'
import {
  IconAlertCircle,
  IconCheck,
  IconCloudDownload,
  IconDownload,
  IconHistory,
  IconKey,
  IconLink,
  IconLoader2,
  IconPackage,
  IconPlayerStop,
  IconRefresh,
  IconX,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Preset card
// ─────────────────────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  onDownload,
  isStarting,
  isOnDisk,
}: {
  preset: ModelPreset
  onDownload: (preset: ModelPreset) => void
  isStarting: boolean
  isOnDisk: boolean
}) {
  // When the file is already on disk the user can explicitly request re-download.
  const [forceDownload, setForceDownload] = useState(false)
  // const showDownloadBtn = !isOnDisk || forceDownload

  return (
    <Group
      justify="space-between"
      align="center"
      px="md"
      py="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        '&:last-child': { borderBottom: 'none' },
        opacity: isOnDisk && !forceDownload ? 0.75 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* ── Info ── */}
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" align="center">
          <Text size="sm" fw={500} style={{ lineHeight: 1.3 }}>
            {preset.name}
          </Text>

          {isOnDisk && (
            <Tooltip label="File already on disk" withArrow>
              <Badge
                size="xs"
                color="teal"
                variant="light"
                leftSection={<IconCheck size={9} />}
                style={{ cursor: 'default' }}
              >
                On disk
              </Badge>
            </Tooltip>
          )}

          {preset.requiresHfToken && (
            <Tooltip label="Requires HuggingFace token (gated model)" withArrow>
              <Badge
                size="xs"
                color="yellow"
                variant="light"
                leftSection={<IconKey size={9} />}
                style={{ cursor: 'default' }}
              >
                Gated
              </Badge>
            </Tooltip>
          )}
        </Group>

        <Group gap="xs">
          <Badge size="xs" color="gray" variant="outline" radius="sm">
            {ROLE_LABEL[preset.role as ModelRole] ?? preset.role}
          </Badge>
          {preset.sizeMb != null && (
            <Text size="xs" c="dimmed">
              ~{preset.sizeMb >= 1000
                ? `${(preset.sizeMb / 1024).toFixed(1)} GB`
                : `${preset.sizeMb} MB`}
            </Text>
          )}
          {preset.description && (
            <Text
              size="xs"
              c="dimmed"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              maw={360}
            >
              {preset.description}
            </Text>
          )}
        </Group>
      </Stack>

      {/* ── Action ── */}
      <Group gap="xs" style={{ flexShrink: 0 }}>
        {isOnDisk && !forceDownload ? (
          <Tooltip label="Download again (overwrite)" withArrow>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={12} />}
              onClick={() => setForceDownload(true)}
            >
              Re-download
            </Button>
          </Tooltip>
        ) : (
          <>
            {/* Cancel re-download intent */}
            {isOnDisk && forceDownload && (
              <Tooltip label="Cancel — keep existing file" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setForceDownload(false)}
                >
                  <IconX size={13} />
                </ActionIcon>
              </Tooltip>
            )}
            <Button
              size="xs"
              variant={isOnDisk ? 'outline' : 'light'}
              color={isOnDisk ? 'orange' : undefined}
              leftSection={<IconDownload size={13} />}
              onClick={() => {
                setForceDownload(false)
                onDownload(preset)
              }}
              loading={isStarting}
            >
              {isOnDisk ? 'Overwrite' : 'Download'}
            </Button>
          </>
        )}
      </Group>
    </Group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Arch accordion header
// ─────────────────────────────────────────────────────────────────────────────

function ArchHeader({
  arch,
  count,
  downloadedCount,
}: {
  arch: ModelArchitecture
  count: number
  downloadedCount: number
}) {
  return (
    <Group gap="sm" align="center">
      <Badge size="md" variant="light" color={ARCH_COLOR[arch]} radius="sm" style={{ minWidth: 86 }}>
        {ARCH_LABEL[arch]}
      </Badge>
      <Text size="sm" c="dimmed">
        {count} {count === 1 ? 'preset' : 'presets'}
      </Text>
      {downloadedCount > 0 && (
        <Text size="xs" c="teal.6" style={{ fontVariantNumeric: 'tabular-nums' }}>
          · {downloadedCount}/{count} on disk
        </Text>
      )}
    </Group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Presets tab
// ─────────────────────────────────────────────────────────────────────────────

const ARCH_ORDER: ModelArchitecture[] = [
  'flux', 'chroma', 'sdxl', 'sd3', 'anima', 'lumina', 'hunyuan', 'sd1', 'sd2',
]

function PresetsTab({
  onDownload,
  startingId,
  onDiskFilenames,
}: {
  onDownload: (preset: ModelPreset) => void
  startingId: string | null
  /** Set of filenames currently present on disk (model.filename values) */
  onDiskFilenames: Set<string>
}) {
  const { data: presets, isLoading, isError } = useDownloaderPresets()

  if (isLoading) {
    return (
      <Stack gap="xs">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={56} radius="md" />)}
      </Stack>
    )
  }

  if (isError || !presets) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
        Could not load presets.
      </Alert>
    )
  }

  const groups = ARCH_ORDER
    .filter((arch) => presets[arch]?.length)
    .map((arch) => ({ arch, items: presets[arch] }))

  return (
    <Accordion
      multiple
      defaultValue={groups.map((g) => g.arch)}
      variant="separated"
      radius="md"
      styles={{
        item: {
          border: '1px solid var(--mantine-color-default-border)',
          background: 'var(--gd-surface)',
        },
        control: { paddingTop: 10, paddingBottom: 10 },
        content: { padding: 0, paddingBottom: 0 },
      }}
    >
      {groups.map(({ arch, items }) => {
        const downloadedCount = items.filter(
          (p) => onDiskFilenames.has(p.filename),
        ).length

        return (
          <Accordion.Item key={arch} value={arch}>
            <Accordion.Control>
              <ArchHeader
                arch={arch as ModelArchitecture}
                count={items.length}
                downloadedCount={downloadedCount}
              />
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap={0}>
                {items.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onDownload={onDownload}
                    isStarting={startingId === preset.id}
                    isOnDisk={onDiskFilenames.has(preset.filename)}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Job row
// ─────────────────────────────────────────────────────────────────────────────

function JobRow({ job, onCancel }: { job: DownloadJob; onCancel: (id: string) => void }) {
  const isActive = job.status === 'pending' || job.status === 'downloading'
  const progress = job.progressPercent < 0 ? null : job.progressPercent

  return (
    <Stack
      gap="xs"
      px="md"
      py="sm"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" align="center">
            <Text
              size="sm"
              fw={500}
              style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: '0.8rem' }}
            >
              {job.filename}
            </Text>
            <Badge size="xs" color={ARCH_COLOR[job.arch]} variant="light" radius="sm">
              {ARCH_LABEL[job.arch]}
            </Badge>
          </Group>
          <Group gap="xs">
            <Badge size="xs" color={STATUS_COLOR[job.status]} variant="dot">
              {STATUS_LABEL[job.status]}
            </Badge>
            {job.bytesTotal > 0 && (
              <Text size="xs" c="dimmed">
                {formatBytes(job.bytesDownloaded)} / {formatBytes(job.bytesTotal)}
              </Text>
            )}
            {job.bytesTotal === 0 && job.bytesDownloaded > 0 && (
              <Text size="xs" c="dimmed">
                {formatBytes(job.bytesDownloaded)} downloaded
              </Text>
            )}
            {job.error && (
              <Text
                size="xs"
                c="red"
                style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: '0.75rem' }}
              >
                {job.error}
              </Text>
            )}
          </Group>
        </Stack>

        {isActive && (
          <Tooltip label="Cancel download" withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => onCancel(job.id)}
            >
              <IconPlayerStop size={13} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {isActive && (
        <Progress
          value={progress ?? 0}
          animated={progress === null || progress === 0}
          color={job.status === 'pending' ? 'gray' : 'blue'}
          size="sm"
          radius="xl"
          striped={job.status === 'pending'}
        />
      )}
    </Stack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Jobs tab
// ─────────────────────────────────────────────────────────────────────────────

function JobsTab({ onCancel }: { onCancel: (id: string) => void }) {
  const { data: jobs = [], isLoading } = useDownloadJobs()

  const active = jobs.filter((j) => j.status === 'pending' || j.status === 'downloading')
  const history = jobs.filter((j) => j.status !== 'pending' && j.status !== 'downloading')

  if (isLoading) {
    return (
      <Stack gap="xs">
        {[1, 2].map((i) => <Skeleton key={i} height={72} radius="md" />)}
      </Stack>
    )
  }

  if (jobs.length === 0) {
    return (
      <Box
        style={{
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 8,
        }}
      >
        <ThemeIcon size={48} variant="light" color="gray" radius="xl">
          <IconCloudDownload size={24} />
        </ThemeIcon>
        <Text size="sm" c="dimmed">No downloads yet</Text>
      </Box>
    )
  }

  return (
    <Stack gap="md">
      {active.length > 0 && (
        <Stack
          gap={0}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--gd-surface)',
          }}
        >
          <Group
            gap="xs"
            px="md"
            py="xs"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <IconLoader2 size={14} style={{ color: 'var(--mantine-color-blue-5)' }} />
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
              Active
            </Text>
            <Badge size="xs" color="blue" variant="filled" circle>
              {active.length}
            </Badge>
          </Group>
          {active.map((job) => (
            <JobRow key={job.id} job={job} onCancel={onCancel} />
          ))}
        </Stack>
      )}

      {history.length > 0 && (
        <Stack
          gap={0}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--gd-surface)',
          }}
        >
          <Group
            gap="xs"
            px="md"
            py="xs"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <IconHistory size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
              History
            </Text>
          </Group>
          {history.map((job) => (
            <JobRow key={job.id} job={job} onCancel={onCancel} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom URL modal
// ─────────────────────────────────────────────────────────────────────────────

const ALL_ARCHS: ModelArchitecture[] = ['flux', 'chroma', 'sdxl', 'sd3', 'anima', 'lumina', 'hunyuan', 'sd1', 'sd2']
const ALL_ROLES: ModelRole[] = ['checkpoint', 'dit', 'unet', 'ae', 'vae', 'clip_l', 'clip_g', 't5xxl', 'gemma2', 'qwen3', 'qwen2_5_vl', 'byt5', 'lora', 'text_encoder']

function CustomUrlModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
}: {
  opened: boolean
  onClose: () => void
  onSubmit: (body: StartDownloadRequest) => void
  isLoading: boolean
}) {
  const [url, setUrl] = useState('')
  const [arch, setArch] = useState<ModelArchitecture | null>(null)
  const [role, setRole] = useState<ModelRole | null>(null)
  const [filename, setFilename] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  const canSubmit = url.trim().startsWith('http') && arch && role

  const handleSubmit = () => {
    if (!url.trim().startsWith('http')) {
      setUrlError('Must be a valid https:// URL')
      return
    }
    if (!arch || !role) return
    onSubmit({ url: url.trim(), arch, role, filename: filename.trim() || undefined })
  }

  const handleClose = () => {
    setUrl('')
    setArch(null)
    setRole(null)
    setFilename('')
    setUrlError(null)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconLink size={16} />
          <Text fw={600} size="sm">Download from URL</Text>
        </Group>
      }
      radius="md"
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="URL"
          description="HuggingFace, CivitAI or direct HTTPS link"
          placeholder="https://huggingface.co/.../resolve/main/model.safetensors"
          value={url}
          onChange={(e) => { setUrl(e.currentTarget.value); setUrlError(null) }}
          error={urlError}
          leftSection={<IconLink size={14} />}
        />

        <Group grow>
          <Select
            label="Architecture"
            placeholder="Select arch"
            data={ALL_ARCHS.map((a) => ({ value: a, label: ARCH_LABEL[a] }))}
            value={arch}
            onChange={(v) => setArch(v as ModelArchitecture | null)}
            required
          />
          <Select
            label="Role"
            placeholder="Select role"
            data={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r as ModelRole] ?? r }))}
            value={role}
            onChange={(v) => setRole(v as ModelRole | null)}
            required
            searchable
          />
        </Group>

        <TextInput
          label="Filename"
          description="Leave blank to use the filename from the URL"
          placeholder="model.safetensors"
          value={filename}
          onChange={(e) => setFilename(e.currentTarget.value)}
        />

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            leftSection={<IconDownload size={14} />}
            disabled={!canSubmit}
            loading={isLoading}
            onClick={handleSubmit}
          >
            Start Download
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HFDownloaderPage
// ─────────────────────────────────────────────────────────────────────────────

export default function HFDownloaderPage() {
  const [tab, setTab] = useState<string | null>('presets')
  const [startingId, setStartingId] = useState<string | null>(null)
  const [customModalOpen, { open: openCustom, close: closeCustom }] = useDisclosure(false)

  const { data: jobs = [] } = useDownloadJobs()
  const { data: models = [] } = useModels()
  const startMutation = useStartDownload()
  const cancelMutation = useCancelDownload()

  /** Set of all filenames currently on disk — used to mark presets as downloaded. */
  const onDiskFilenames = useMemo(
    () => new Set(models.map((m) => m.filename)),
    [models],
  )

  const activeCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'downloading',
  ).length

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePresetDownload = async (preset: ModelPreset) => {
    setStartingId(preset.id)
    try {
      await startMutation.mutateAsync({ presetId: preset.id })
      notifications.show({
        title: 'Download started',
        message: preset.name,
        color: 'blue',
        icon: <IconCheck size={14} />,
        autoClose: 3000,
      })
      setTab('jobs')
    } catch (e) {
      notifications.show({
        title: 'Failed to start download',
        message: e instanceof Error ? e.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={14} />,
      })
    } finally {
      setStartingId(null)
    }
  }

  const handleCustomDownload = async (body: StartDownloadRequest) => {
    try {
      await startMutation.mutateAsync(body)
      notifications.show({
        title: 'Download started',
        message: 'url' in body ? body.url.split('/').pop() : body.presetId,
        color: 'blue',
        icon: <IconCheck size={14} />,
        autoClose: 3000,
      })
      closeCustom()
      setTab('jobs')
    } catch (e) {
      notifications.show({
        title: 'Failed to start download',
        message: e instanceof Error ? e.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={14} />,
      })
    }
  }

  const handleCancel = async (id: string) => {
    await cancelMutation.mutateAsync(id)
    notifications.show({
      title: 'Download cancelled',
      message: jobs.find((j) => j.id === id)?.filename ?? id,
      color: 'orange',
      icon: <IconPlayerStop size={14} />,
      autoClose: 2500,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <CustomUrlModal
        opened={customModalOpen}
        onClose={closeCustom}
        onSubmit={(body) => void handleCustomDownload(body)}
        isLoading={startMutation.isPending}
      />

      <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>

        {/* Header */}
        <Box
          p="lg"
          pb="md"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        >
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Group gap="sm" align="center">
                <IconCloudDownload size={20} />
                <Title order={3}>Model Downloader</Title>
                {activeCount > 0 && (
                  <Badge color="blue" size="sm" variant="filled">
                    {activeCount} active
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Download base models and text encoders from HuggingFace or CivitAI
              </Text>
            </Stack>

            <Button
              variant="outline"
              leftSection={<IconLink size={15} />}
              onClick={openCustom}
              size="sm"
            >
              Custom URL
            </Button>
          </Group>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={setTab}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          styles={{
            root: { display: 'flex', flexDirection: 'column', flex: 1 },
            panel: { flex: 1, overflow: 'hidden' },
          }}
        >
          <Tabs.List px="lg" style={{ flexShrink: 0 }}>
            <Tabs.Tab value="presets" leftSection={<IconPackage size={14} />}>
              Presets
            </Tabs.Tab>
            <Tabs.Tab
              value="jobs"
              leftSection={<IconRefresh size={14} />}
              rightSection={
                activeCount > 0 ? (
                  <Badge size="xs" color="blue" variant="filled" circle>
                    {activeCount}
                  </Badge>
                ) : undefined
              }
            >
              Downloads
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="presets">
            <ScrollArea style={{ height: '100%' }} p="lg">
              <PresetsTab
                onDownload={(p) => void handlePresetDownload(p)}
                startingId={startingId}
                onDiskFilenames={onDiskFilenames}
              />
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="jobs">
            <ScrollArea style={{ height: '100%' }} p="lg">
              <JobsTab onCancel={(id) => void handleCancel(id)} />
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>

      </Stack>
    </>
  )
}