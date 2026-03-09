import { Button, Group, Stack, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import type { JobSummary } from '@services/jobs'
import JobsTable from '@tables/jobs/JobsTable'
import { useNavigate } from '@tanstack/react-router'

export default function JobsPage() {
  const navigate = useNavigate()

  const handleNew = () => navigate({ to: '/jobs/new' })

  const handleView = (job: JobSummary) =>
    navigate({ to: '/jobs/' + job.id })

  const handleViewOutputs = (job: JobSummary) =>
    navigate({ to: '/jobs/' + job.id + '/outputs' })

  return (
    <Stack gap="lg" p="lg" className="w-full">
      <Group justify="space-between" align="center">
        <Title order={3}>Training Jobs</Title>
        <Button
          variant="outline"
          leftSection={<IconPlus size={16} />}
          onClick={handleNew}
        >
          New job
        </Button>
      </Group>

      <JobsTable onView={handleView} onViewOutputs={handleViewOutputs} />
    </Stack>
  )
}