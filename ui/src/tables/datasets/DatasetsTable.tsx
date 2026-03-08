import { ActionIcon, Center, Group, Text, Tooltip } from '@mantine/core'
import { openConfirmModal } from '@mantine/modals'
import { IconClick, IconEdit, IconEye, IconTrash, IconTrashX, IconChartBarOff } from '@tabler/icons-react'
import type { DataTableColumn } from 'mantine-datatable'
import { DataTable } from 'mantine-datatable'
import { useContextMenu } from 'mantine-contextmenu'
import { useCallback, useMemo, useState } from 'react'
import type { DatasetSummary } from '@services/datasets'
import { useDatasets, useRemoveDataset } from '@services/datasets'

interface DatasetsTableProps {
  onAdd: () => void
  onView: (dataset: DatasetSummary) => void
  onEdit: (dataset: DatasetSummary) => void
}

export default function DatasetsTable({ onView, onEdit }: DatasetsTableProps) {
  const { showContextMenu, hideContextMenu } = useContextMenu()
  const [selectedRecords, setSelectedRecords] = useState<DatasetSummary[]>([])
  const { data, isFetching } = useDatasets()
  const { mutate: removeDataset } = useRemoveDataset()

  // ── Delete helpers ──────────────────────────────────────────────────────────

  const confirmDeleteOne = useCallback(
    (dataset: DatasetSummary) => {
      openConfirmModal({
        title: 'Remove Dataset',
        centered: true,
        children: (
          <Text size="sm">
            Are you sure you want to remove <strong>{dataset.name}</strong>? It's irreversible.
          </Text>
        ),
        labels: { confirm: 'Remove', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: () => removeDataset(dataset.name),
      })
    },
    [removeDataset],
  )

  const confirmDeleteSelected = useCallback(() => {
    openConfirmModal({
      title: `Remove ${selectedRecords.length} datasets`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove <strong>{selectedRecords.length}</strong> selected datasets? It's irreversible.
        </Text>
      ),
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        selectedRecords.forEach((d) => removeDataset(d.name))
        setSelectedRecords([])
      },
    })
  }, [selectedRecords, removeDataset])

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns: DataTableColumn<DatasetSummary>[] = useMemo(
    () => [
      {
        accessor: 'name',
        title: 'Name',
        sortable: true,
      },
      {
        accessor: 'path',
        title: 'Path on disk',
        sortable: false,
      },
      {
        accessor: 'imageCount',
        title: 'Image count',
        sortable: true,
      },
      {
        accessor: 'captionCoverage',
        title: 'Caption coverage (%)',
        render: ({ captionCoverage }) => (
          <Text size="xs" c={captionCoverage ? Math.round(captionCoverage * 100) >= 100 ? 'green' : 'yellow' : 'red'} fw={500}>
            {Math.round(captionCoverage * 100)}%
          </Text>
        ),
      },
      {
        accessor: 'actions',
        title: (
          <Center>
            <IconClick size={16} />
          </Center>
        ),
        width: '0%',
        render: (dataset) => (
          <Group gap={4} justify="right" wrap="nowrap">
            <Tooltip label="View" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={(e) => {
                  e.stopPropagation()
                  onView(dataset)
                }}
              >
                <IconEye size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(dataset)
                }}
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Remove" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={(e) => {
                  e.stopPropagation()
                  confirmDeleteOne(dataset)
                }}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [onView, onEdit, confirmDeleteOne],
  )

  // ── Context menu ─────────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    ({ record, event }: { record: DatasetSummary; event: React.MouseEvent }) => {
      showContextMenu([
        {
          key: 'view',
          icon: <IconEye size={14} />,
          title: `View ${record.name}`,
          onClick: () => onView(record),
        },
        {
          key: 'edit',
          icon: <IconEdit size={14} />,
          title: `Edit ${record.name}`,
          onClick: () => onEdit(record),
        },
        {
          key: 'remove',
          icon: <IconTrashX color="red" size={14} />,
          title: `Remove ${record.name}`,
          color: 'red',
          onClick: () => confirmDeleteOne(record),
        },
        {
          key: 'divider',
          hidden:
            selectedRecords.length <= 1 ||
            !selectedRecords.some((r) => r.name === record.name),
        },
        {
          key: 'removeMany',
          hidden:
            selectedRecords.length <= 1 ||
            !selectedRecords.some((r) => r.name === record.name),
          icon: <IconTrash color="red" size={14} />,
          title: `Remove ${selectedRecords.length} selected`,
          color: 'red',
          onClick: confirmDeleteSelected,
        },
      ], { className: 'px-3 py-2 !rounded-md' })(event)
    },
    [showContextMenu, selectedRecords, onView, onEdit, confirmDeleteOne, confirmDeleteSelected],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DataTable<DatasetSummary>
      idAccessor='name'
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
      noRecordsText="No datasets found"
      noRecordsIcon={<IconChartBarOff size={36} strokeWidth={1.5} />}
    />
  )
}

export type { DatasetsTableProps }