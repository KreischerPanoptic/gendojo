import HFDownloaderPage from '@pages/models/downloader/hf/HFDownloaderPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/models/download/hf/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <HFDownloaderPage/>
}
