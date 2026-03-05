import { Button, Group, Stack, Title } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import type { DatasetSummary } from '@services/datasets'
import DatasetsTable from '@tables/datasets/DatasetsTable'
import { useNavigate } from '@tanstack/react-router'

export default function DatasetsPage() {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate({ to: '/datasets/upload' })
  }

  const handleEdit = (dataset: DatasetSummary) => {
    navigate({ to: '/datasets/edit/'+dataset.name })
  }

  return (
    <>
      <Stack gap="lg" p="lg" className="w-full">
        {/* ---- Page header ---- */}
        <Group justify='start' align="center">
          <Title order={3}>Datasets</Title>

          <Button variant='outline' radius={'xl'} leftSection={<IconUpload size={16} />} onClick={handleAdd}>
            Upload new
          </Button>
        </Group>

        {/* ---- Table ---- */}
        <DatasetsTable onAdd={handleAdd} onEdit={handleEdit} />
      </Stack>
    </>
  )
}