import EditDatasetPage from '@pages/datasets/EditDatasetPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/datasets/edit/$datasetName')({
  validateSearch: (search: Record<string, unknown>) => ({
    filename: typeof search.filename === 'string' ? search.filename : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <EditDatasetPage />
}