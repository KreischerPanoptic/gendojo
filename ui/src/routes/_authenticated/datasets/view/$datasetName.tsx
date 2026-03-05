import ViewDatasetPage from '@pages/datasets/ready/ViewDatasetPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/datasets/view/$datasetName')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <ViewDatasetPage/>
  );
}
