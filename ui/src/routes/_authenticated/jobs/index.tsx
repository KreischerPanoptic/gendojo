import JobsPage from '@pages/jobs/JobsPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/jobs/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <JobsPage/>
  );
}
