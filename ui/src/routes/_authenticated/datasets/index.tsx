import DatasetsPage from '@pages/datasets/DatasetsPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/datasets/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DatasetsPage/>
  );
}
