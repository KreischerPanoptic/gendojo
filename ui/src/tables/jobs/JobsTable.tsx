import {
  ActionIcon,
  Badge,
  Center,
  Group,
  Text,
  Tooltip,
} from '@mantine/core'
import { openConfirmModal } from '@mantine/modals'
import {
  IconClick,
  IconEye,
  IconPlayerStop,
  IconTerminal2,
  IconClockHour4,
  IconAlertTriangle,
  IconDatabase,
} from '@tabler/icons-react'
import type { DataTableColumn } from 'mantine-datatable'
import { DataTable } from 'mantine-datatable'
import { useContextMenu } from 'mantine-contextmenu'
import { useCallback, useMemo, useState } from 'react'
import type { JobSummary, JobStatus } from '@services/jobs'
import { useJobs, useKillJob } from '@services/jobs'

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<JobStatus, string> = {
  pending: 'yellow',
  running: 'blue',
  done:    'green',
  failed:  'red',
  killed:  'gray',
}

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  done:    'Done',
  failed:  'Failed',
  killed:  'Killed',
}

function isActive(status: JobStatus) {
  return status === 'pending' || status === 'running'
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration helper
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const totalSec = Math.floor((end - start) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface JobsTableProps {
  onView: (job: JobSummary) => void
  onViewOutputs: (job: JobSummary) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function JobsTable({ onView, onViewOutputs }: JobsTableProps) {
  const { showContextMenu, hideContextMenu } = useContextMenu()
  const [selectedRecords, setSelectedRecords] = useState<JobSummary[]>([])

  const { data, isFetching } = useJobs()
  const { mutate: killJob } = useKillJob()

  // ── Kill helpers ────────────────────────────────────────────────────────────

  const confirmKill = useCallback(
    (job: JobSummary) => {
      openConfirmModal({
        title: 'Kill Job',
        centered: true,
        children: (
          <Text size="sm">
            Stop training job <strong>{job.name}</strong>? The process will receive SIGTERM.
          </Text>
        ),
        labels: { confirm: 'Kill', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: () => killJob(job.id),
      })
    },
    [killJob],
  )

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns: DataTableColumn<JobSummary>[] = useMemo(
    () => [
      {
        accessor: 'status',
        title: 'Status',
        width: 110,
        sortable: true,
        render: ({ status }) => (
          <Badge
            size="sm"
            variant="light"
            color={STATUS_COLOR[status]}
          >
            {STATUS_LABEL[status]}
          </Badge>
        ),
      },
      {
        accessor: 'name',
        title: 'Name',
        sortable: true,
      },
      {
        accessor: 'arch',
        title: 'Arch',
        width: 90,
        render: ({ arch }) => (
          <Text size="xs" c="dimmed" ff="monospace">
            {arch}
          </Text>
        ),
      },
      {
        accessor: 'datasetName',
        title: 'Dataset',
        render: ({ datasetName }) => (
          <Text size="sm">{datasetName ?? <Text span c="dimmed">—</Text>}</Text>
        ),
      },
      {
        accessor: 'createdAt',
        title: 'Created',
        sortable: true,
        render: ({ createdAt }) => (
          <Text size="xs" c="dimmed">
            {formatDate(createdAt)}
          </Text>
        ),
      },
      {
        accessor: 'duration',
        title: 'Duration',
        render: ({ startedAt, finishedAt, status }) => (
          <Group gap={4} wrap="nowrap">
            {isActive(status) && (
              <IconClockHour4 size={12} style={{ color: 'var(--mantine-color-blue-5)' }} />
            )}
            <Text size="xs" c={isActive(status) ? 'blue' : 'dimmed'}>
              {formatDuration(startedAt, finishedAt)}
            </Text>
          </Group>
        ),
      },
      {
        accessor: 'exitCode',
        title: 'Exit',
        width: 60,
        render: ({ exitCode, status }) => {
          if (exitCode === undefined || exitCode === null) return <Text c="dimmed" size="xs">—</Text>
          const isError = status === 'failed' || exitCode !== 0
          return (
            <Group gap={4} wrap="nowrap">
              {isError && <IconAlertTriangle size={12} color="var(--mantine-color-red-5)" />}
              <Text size="xs" c={isError ? 'red' : 'green'} ff="monospace">
                {exitCode}
              </Text>
            </Group>
          )
        },
      },
      {
        accessor: 'actions',
        title: (
          <Center>
            <IconClick size={16} />
          </Center>
        ),
        width: '0%',
        render: (job) => (
          <Group gap={4} justify="right" wrap="nowrap">
            <Tooltip label="View logs" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={(e) => {
                  e.stopPropagation()
                  onView(job)
                }}
              >
                <IconEye size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="View outputs" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewOutputs(job)
                }}
              >
                <IconDatabase size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={isActive(job.status) ? 'Kill job' : 'Already finished'} withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                disabled={!isActive(job.status)}
                onClick={(e) => {
                  e.stopPropagation()
                  confirmKill(job)
                }}
              >
                <IconPlayerStop size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [onView, confirmKill],
  )

  // ── Context menu ─────────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    ({ record, event }: { record: JobSummary; event: React.MouseEvent }) => {
      showContextMenu([
        {
          key: 'view',
          icon: <IconEye size={14} />,
          title: `View logs — ${record.name}`,
          onClick: () => onView(record),
        },
        {
          key: 'terminal',
          icon: <IconTerminal2 size={14} />,
          title: `Script: ${record.script}`,
          disabled: true,
          onClick: () => {}
        },
        {
          key: 'divider-kill',
          hidden: !isActive(record.status),
        },
        {
          key: 'kill',
          hidden: !isActive(record.status),
          icon: <IconPlayerStop color="red" size={14} />,
          title: `Kill ${record.name}`,
          color: 'red',
          onClick: () => confirmKill(record),
        },
      ], { className: 'px-3 py-2 !rounded-md' })(event)
    },
    [showContextMenu, onView, confirmKill],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DataTable<JobSummary>
      idAccessor="id"
      backgroundColor={{ light: 'light', dark: 'dark' }}
      withTableBorder
      withRowBorders
      highlightOnHover
      borderRadius="md"
      pinLastColumn
      minHeight={300}
      fetching={isFetching}
      records={data}
      selectedRecords={selectedRecords}
      onSelectedRecordsChange={setSelectedRecords}
      onRowContextMenu={handleContextMenu}
      onScroll={hideContextMenu}
      columns={columns}
      noRecordsText="No training jobs yet"
      noRecordsIcon={<IconTerminal2 size={36} strokeWidth={1.5} />}
      rowColor={({ status }) =>
        status === 'running'
          ? { dark: 'rgba(59, 130, 246, 0.05)', light: 'rgba(59, 130, 246, 0.03)' }
          : undefined
      }
    />
  )
}

export type { JobsTableProps }