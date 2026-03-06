import {
  Accordion,
  Badge,
  Box,
  Group,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import { IconBox } from '@tabler/icons-react'
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable'
import { DataTable } from 'mantine-datatable'
import { useMemo, useState } from 'react'
import {
  useModels,
  type ModelArchitecture,
  type ModelFile,
  type ModelRole,
  type ModelType,
  ARCH_COLOR,
  ARCH_LABEL,
  ROLE_LABEL,
  formatSize,
} from '@services/models'

// ─────────────────────────────────────────────────────────────────────────────
// Inner table columns
// ─────────────────────────────────────────────────────────────────────────────

const innerColumns: DataTableColumn<ModelFile>[] = [
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
  {
    accessor: 'sizeBytes',
    title: 'Size',
    sortable: true,
    textAlign: 'right',
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
    width: 130,
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
]

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
  return (
    <Group gap="sm" align="center">
      <Badge
        size="md"
        variant="light"
        color={ARCH_COLOR[arch]}
        radius="sm"
        style={{ minWidth: 86, textAlign: 'center' }}
      >
        {ARCH_LABEL[arch]}
      </Badge>
      <Text size="sm" c="dimmed">
        {count} {count === 1 ? 'model' : 'models'}
      </Text>
      <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-mono)' }}>
        · {formatSize(totalBytes)}
      </Text>
    </Group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable inner panel
// ─────────────────────────────────────────────────────────────────────────────

function ArchPanel({ models }: { models: ModelFile[] }) {
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ModelFile>>({
    columnAccessor: 'name',
    direction: 'asc',
  })

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

  return (
    <DataTable<ModelFile>
      withRowBorders
      withTableBorder
      highlightOnHover
      borderRadius="md"
      records={sorted}
      columns={innerColumns}
      sortStatus={sortStatus}
      onSortStatusChange={setSortStatus}
      noRecordsText="No models"
      styles={{
        header: { background: 'transparent' },
      }}
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
  'flux', 'sdxl', 'sd3', 'chroma', 'anima', 'lumina', 'hunyuan', 'sd1', 'sd2', 'unknown',
]

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function ModelsTable({ typeFilter }: ModelsTableProps) {
  const { data, isFetching } = useModels()

  const groups = useMemo(() => {
    const source = data ?? []
    const filtered = typeFilter ? source.filter((m) => m.type === typeFilter) : source

    const map = new Map<ModelArchitecture, ModelFile[]>()
    for (const m of filtered) {
      const key = m.arch as ModelArchitecture
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }

    return ARCH_ORDER
      .filter((a) => map.has(a))
      .map((a) => ({
        arch: a,
        models: map.get(a)!,
        totalBytes: map.get(a)!.reduce((sum, m) => sum + (m.sizeBytes ?? 0), 0),
      }))
  }, [data, typeFilter])

  if (isFetching && !data) {
    return (
      <Stack gap="xs">
        {[1, 2, 3].map((i) => <Skeleton key={i} height={52} radius="md" />)}
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
        <Text size="sm" c="dimmed">No models found</Text>
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
          <Accordion.Panel className='px-2 py-1'>
            <ArchPanel models={models} />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

export type { ModelsTableProps }