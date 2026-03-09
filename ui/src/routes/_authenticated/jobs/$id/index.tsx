import JobDetailPage from '@pages/jobs/JobDetailsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/jobs/$id/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <JobDetailPage/>
}
