import UploadDatasetPage from '@pages/datasets/UploadDatasetPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/datasets/upload')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <UploadDatasetPage/>
  );
}
