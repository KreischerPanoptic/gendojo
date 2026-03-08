import NewJobPage from '@pages/jobs/NewJobPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/jobs/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <NewJobPage/>
  );
}
