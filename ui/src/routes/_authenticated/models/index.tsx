import ModelsPage from '@pages/models/local/ModelsPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/models/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <ModelsPage/>
  );
}
