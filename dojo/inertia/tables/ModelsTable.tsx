import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  List,
  Loader,
  Modal,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconAlertTriangle,
  IconBox,
  IconCircleCheck,
  IconCircleX,
  IconHelp,
  IconLink,
  IconShieldCheck,
  IconTrash,
} from '@tabler/icons-react'
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable'
import { DataTable } from 'mantine-datatable'
import { useMemo, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Integrity badge
// ─────────────────────────────────────────────────────────────────────────────

const INTEGRITY_COLOR: Record<IntegrityStatus, string> = {
  ok: 'teal',
  corrupted: 'red',
  unknown: 'gray',
}

const INTEGRITY_LABEL: Record<IntegrityStatus, string> = {
  ok: 'OK',
  corrupted: 'Corrupted',
  unknown: 'No hash',
}

function IntegrityBadge({ result }: { result: FileIntegrityResult }) {
  const icon =
    result.status === 'ok' ? (
      <IconCircleCheck size={12} />
    ) : result.status === 'corrupted' ? (
      <IconCircleX size={12} />
    ) : (
      <IconHelp size={12} />
    )

  return (
    <Tooltip
      label={
        result.status === 'ok'
          ? `SHA-256 verified`
          : result.status === 'corrupted'
            ? `Expected: ${result.expectedSha256}\nGot: ${result.computedSha256}`
            : `No hash registered — computed: ${result.computedSha256}`
      }
      multiline
      w={340}
      withArrow
    >
      <Badge size="xs" variant="light" color={INTEGRITY_COLOR[result.status]} leftSection={icon}>
        {INTEGRITY_LABEL[result.status]}
      </Badge>
    </Tooltip>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete single file — confirmation modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteFileButton({ model }: { model: ModelFile }) {
  const [opened, { open, close }] = useDisclosure(false)
  const { mutate: deleteModel, isPending } = useDeleteModel()

  const confirm = () => {
    deleteModel(model.id, { onSuccess: close })
  }

  return (
    <>
      <Tooltip label="Delete file" withArrow>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="red"
          onClick={open}
          aria-label={`Delete ${model.filename}`}
        >
          <IconTrash size={13} />
        </ActionIcon>
      </Tooltip>

      <Modal opened={opened} onClose={close} title="Delete model file" size="sm" centered>
        <Stack gap="md">
          <Text size="sm">
            Delete{' '}
            <Text component="span" fw={600} style={{ fontFamily: 'var(--font-mono)' }}>
              {model.filename}
            </Text>
            {'  '}
            <Text component="span" size="xs" c="dimmed">
              ({formatSize(model.sizeBytes)})
            </Text>
          </Text>

          {/* Warn if deleting this shared file will break other architectures */}
          {model.sharedWith && model.sharedWith.length > 0 && (
            <Box
              p="xs"
              style={{
                borderRadius: 6,
                background: 'var(--mantine-color-orange-light)',
                border: '1px solid var(--mantine-color-orange-light-hover)',
              }}
            >
              <Group gap="xs" mb={4}>
                <IconAlertTriangle size={13} color="var(--mantine-color-orange-6)" />
                <Text size="xs" fw={600} c="orange">
                  Shared file
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Also used by:{' '}
                {(model.sharedWith as ModelArchitecture[])
                  .map((a) => ARCH_LABEL[a] ?? a)
                  .join(', ')}
                . Deleting it will break readiness for those architectures.
              </Text>
            </Box>
          )}

          <Text size="xs" c="dimmed">
            This cannot be undone.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="xs" onClick={close}>
              Cancel
            </Button>
            <Button color="red" size="xs" loading={isPending} onClick={confirm}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Check integrity button — inline result
// ─────────────────────────────────────────────────────────────────────────────

function IntegrityCell({
  model,
  result,
  onResult,
}: {
  model: ModelFile
  result: FileIntegrityResult | undefined
  onResult: (r: FileIntegrityResult) => void
}) {
  const { mutate: check, isPending } = useCheckFileIntegrity()

  if (result) return <IntegrityBadge result={result} />

  return (
    <Tooltip label={`Compute SHA-256 (may take minutes for large files)`} withArrow>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="blue"
        loading={isPending}
        onClick={() => check(model.id, { onSuccess: onResult })}
        aria-label="Check integrity"
      >
        {!isPending && <IconShieldCheck size={13} />}
      </ActionIcon>
    </Tooltip>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Readiness badge in accordion header
// ─────────────────────────────────────────────────────────────────────────────

function ReadinessBadge({ arch }: { arch: ModelArchitecture }) {
  const { data, isLoading } = useArchReadiness(arch)

  if (isLoading) return <Loader size={12} />
  if (!data) return null

  if (data.ready) {
    return (
      <Tooltip label="All required files present" withArrow>
        <Badge size="xs" variant="dot" color="teal" style={{ cursor: 'default' }}>
          Ready
        </Badge>
      </Tooltip>
    )
  }

  const missing = data.missingRoles.map((r) => ROLE_LABEL[r as ModelRole] ?? r).join(', ')

  return (
    <Tooltip label={`Missing: ${missing}`} withArrow>
      <Badge size="xs" variant="dot" color="orange" style={{ cursor: 'default' }}>
        Incomplete
      </Badge>
    </Tooltip>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete arch button + preview modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteArchButton({ arch }: { arch: ModelArchitecture }) {
  const [opened, { open, close }] = useDisclosure(false)
  const [preview, setPreview] = useState<DeleteArchPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const { mutate: deleteArch, isPending } = useDeleteArch()

  const openWithPreview = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingPreview(true)
    try {
      const p = await modelsApi.previewDeleteArch(arch)
      setPreview(p)
      open()
    } finally {
      setLoadingPreview(false)
    }
  }

  const confirm = () => {
    deleteArch(arch, { onSuccess: close })
  }

  return (
    <>
      <Tooltip label={`Delete all ${ARCH_LABEL[arch]} files`} withArrow>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="red"
          loading={loadingPreview}
          onClick={openWithPreview}
          aria-label={`Delete ${arch}`}
        >
          <IconTrash size={13} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={close}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={16} color="var(--mantine-color-red-5)" />
            <Text fw={600}>Delete {ARCH_LABEL[arch]} models</Text>
          </Group>
        }
        size="md"
        centered
      >
        {preview && (
          <Stack gap="md">
            <Text size="sm">
              This will permanently delete{' '}
              <Text component="span" fw={600}>
                {preview.toDelete.length} file{preview.toDelete.length !== 1 ? 's' : ''}
              </Text>{' '}
              ({formatSize(preview.totalSizeMb * 1024 * 1024)}) from disk.
            </Text>

            {preview.sharedWarnings.length > 0 && (
              <Box
                p="sm"
                style={{
                  borderRadius: 6,
                  background: 'var(--mantine-color-orange-light)',
                  border: '1px solid var(--mantine-color-orange-light-hover)',
                }}
              >
                <Group gap="xs" mb={6}>
                  <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />
                  <Text size="xs" fw={600} c="orange">
                    Shared files warning
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mb={6}>
                  The following files are also used by other architectures and will be deleted:
                </Text>
                <List size="xs" spacing={2}>
                  {preview.sharedWarnings.map((w) => (
                    <List.Item key={w.file.id}>
                      <Text
                        component="span"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
                      >
                        {w.file.filename}
                      </Text>
                      <Text component="span" size="xs" c="dimmed">
                        {' '}
                        — also used by:{' '}
                        {(w.sharedWithArches as unknown as ModelArchitecture[])
                          .map((a) => ARCH_LABEL[a])
                          .join(', ')}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Box>
            )}

            <List size="xs" spacing={2} c="dimmed">
              {preview.toDelete.slice(0, 8).map((f) => (
                <List.Item key={f.id}>
                  <Text
                    component="span"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
                  >
                    {f.relativePath}
                  </Text>
                  <Text component="span" size="xs" c="dimmed">
                    {' '}
                    ({formatSize(f.sizeBytes)})
                  </Text>
                </List.Item>
              ))}
              {preview.toDelete.length > 8 && (
                <Text size="xs" c="dimmed">
                  …and {preview.toDelete.length - 8} more
                </Text>
              )}
            </List>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="xs" onClick={close}>
                Cancel
              </Button>
              <Button color="red" size="xs" loading={isPending} onClick={confirm}>
                Delete {preview.toDelete.length} files
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Accordion header
// ─────────────────────────────────────────────────────────────────────────────

function ArchHeader({
  arch,
  count,
  totalBytes,
}: {
  arch: ModelArchitecture
  count: number
  totalBytes: number
}) {
  const isShared = arch === 'unknown'

  return (
    <Group gap="sm" align="center" justify="space-between" style={{ flex: 1 }}>
      <Group gap="sm" align="center">
        <Badge
          size="md"
          variant="light"
          color={isShared ? 'violet' : ARCH_COLOR[arch]}
          radius="sm"
          leftSection={isShared ? <IconLink size={11} /> : undefined}
          style={{ minWidth: 86, textAlign: 'center' }}
        >
          {isShared ? 'Shared files' : ARCH_LABEL[arch]}
        </Badge>
        <Text size="sm" c="dimmed">
          {count} {count === 1 ? (isShared ? 'file' : 'model') : isShared ? 'files' : 'models'}
        </Text>
        <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-mono)' }}>
          · {formatSize(totalBytes)}
        </Text>
        {!isShared && <ReadinessBadge arch={arch} />}
      </Group>

      {!isShared && (
        <Box onClick={(e) => e.stopPropagation()}>
          <DeleteArchButton arch={arch} />
        </Box>
      )}
    </Group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared-with cell — arch badges for files in shared/ directories
// ─────────────────────────────────────────────────────────────────────────────

function SharedWithCell({ sharedWith }: { sharedWith?: string[] }) {
  if (!sharedWith || sharedWith.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    )
  }

  return (
    <Group gap={4} wrap="nowrap">
      {(sharedWith as ModelArchitecture[]).map((a) => (
        <Tooltip key={a} label={ARCH_LABEL[a] ?? a} withArrow>
          <Badge
            size="xs"
            variant="light"
            color={ARCH_COLOR[a] ?? 'gray'}
            radius="sm"
            style={{ cursor: 'default', padding: '0 6px' }}
          >
            {a}
          </Badge>
        </Tooltip>
      ))}
    </Group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable inner panel
// ─────────────────────────────────────────────────────────────────────────────

function ArchPanel({
  models,
  showSharedWith = false,
}: {
  models: ModelFile[]
  showSharedWith?: boolean
}) {
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ModelFile>>({
    columnAccessor: 'name',
    direction: 'asc',
  })

  const [integrityResults, setIntegrityResults] = useState<Record<string, FileIntegrityResult>>({})

  const handleIntegrityResult = (r: FileIntegrityResult) => {
    setIntegrityResults((prev) => ({ ...prev, [r.id]: r }))
  }

  const sorted = useMemo(() => {
    const col = sortStatus.columnAccessor as keyof ModelFile
    return [...models].sort((a, b) => {
      const av = a[col]
      const bv = b[col]
      if (av === bv) return 0
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return sortStatus.direction === 'asc' ? cmp : -cmp
    })
  }, [models, sortStatus])

  const columns: DataTableColumn<ModelFile>[] = [
    {
      accessor: 'name',
      title: 'Name',
      sortable: true,
      render: ({ name }) => (
        <Text size="sm" fw={500} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {name}
        </Text>
      ),
    },
    {
      accessor: 'role',
      title: 'Role',
      sortable: true,
      render: ({ role }) => (
        <Text size="xs" c={role !== 'unknown' ? undefined : 'dimmed'}>
          {role !== 'unknown' ? ROLE_LABEL[role as ModelRole] : '—'}
        </Text>
      ),
    },
    {
      accessor: 'type',
      title: 'Type',
      sortable: true,
      render: ({ type }) => (
        <Text size="xs" c="dimmed" tt="capitalize">
          {type !== 'unknown' ? type.replace('_', ' ') : '—'}
        </Text>
      ),
    },
    // "Used by" column — only rendered for the shared (unknown arch) group
    ...(showSharedWith
      ? [
          {
            accessor: 'sharedWith' as keyof ModelFile,
            title: 'Used by',
            sortable: false,
            width: 200,
            render: (model: ModelFile) => (
              <SharedWithCell sharedWith={model.sharedWith as string[] | undefined} />
            ),
          },
        ]
      : []),
    {
      accessor: 'sizeBytes',
      title: 'Size',
      sortable: true,
      textAlign: 'right' as const,
      width: 96,
      render: ({ sizeBytes }) => (
        <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
          {formatSize(sizeBytes)}
        </Text>
      ),
    },
    {
      accessor: 'id',
      title: 'Path',
      sortable: false,
      render: ({ id }) => (
        <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          {id}
        </Text>
      ),
    },
    {
      accessor: 'modifiedAt',
      title: 'Modified',
      sortable: true,
      width: 110,
      render: ({ modifiedAt }) => (
        <Text size="xs" c="dimmed">
          {new Date(modifiedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      sortable: false,
      width: 64,
      render: (model) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <IntegrityCell
            model={model}
            result={integrityResults[model.id]}
            onResult={handleIntegrityResult}
          />
          <DeleteFileButton model={model} />
        </Group>
      ),
    },
  ]

  return (
    <DataTable<ModelFile>
      withRowBorders
      withTableBorder
      highlightOnHover
      borderRadius="md"
      records={sorted}
      columns={columns}
      sortStatus={sortStatus}
      onSortStatusChange={setSortStatus}
      noRecordsText="No models"
      styles={{ header: { background: 'transparent' } }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Props & arch order
// ─────────────────────────────────────────────────────────────────────────────

interface ModelsTableProps {
  typeFilter?: ModelType
}

const ARCH_ORDER: ModelArchitecture[] = [
  'flux',
  'sdxl',
  'sd3',
  'chroma',
  'anima',
  'lumina',
  'hunyuan',
  'sd1',
  'sd2',
  'unknown',
]

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function ModelsTable({ typeFilter }: ModelsTableProps) {
  const { data, isFetching } = useModels()

  const groups = useMemo(() => {
    let source = data ?? []
    if (!Array.isArray(source)) source = [source]
    const filtered = typeFilter ? source.filter((m) => m.type === typeFilter) : source

    const map = new Map<ModelArchitecture, ModelFile[]>()
    for (const m of filtered) {
      const key = m.arch as ModelArchitecture
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }

    return ARCH_ORDER.filter((a) => map.has(a)).map((a) => ({
      arch: a,
      models: map.get(a)!,
      totalBytes: map.get(a)!.reduce((sum, m) => sum + (m.sizeBytes ?? 0), 0),
    }))
  }, [data, typeFilter])

  if (isFetching && !data) {
    return (
      <Stack gap="xs">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={52} radius="md" />
        ))}
      </Stack>
    )
  }

  if (groups.length === 0) {
    return (
      <Box
        style={{
          minHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 8,
        }}
      >
        <IconBox size={36} strokeWidth={1.5} color="var(--mantine-color-dimmed)" />
        <Text size="sm" c="dimmed">
          No models found
        </Text>
      </Box>
    )
  }

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
        content: { padding: 0, paddingBottom: 4 },
      }}
    >
      {groups.map(({ arch, models, totalBytes }) => (
        <Accordion.Item key={arch} value={arch}>
          <Accordion.Control>
            <ArchHeader arch={arch} count={models.length} totalBytes={totalBytes} />
          </Accordion.Control>
          <Accordion.Panel className="px-2 py-1">
            <ArchPanel models={models} showSharedWith={arch === 'unknown'} />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

export type { ModelsTableProps }
