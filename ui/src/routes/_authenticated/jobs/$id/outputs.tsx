import JobOutputsPage from '@pages/jobs/JobOutputsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/jobs/$id/outputs')({
  component: RouteComponent,
})

function RouteComponent() {
  return <JobOutputsPage/>
}
