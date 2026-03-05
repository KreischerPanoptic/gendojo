import EditDatasetPage from '@pages/datasets/ready/EditDatasetPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/datasets/edit/$datasetName')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <EditDatasetPage/>
  );
}
