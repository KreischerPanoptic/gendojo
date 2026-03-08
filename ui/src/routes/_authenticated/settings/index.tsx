import SettingsPage from '@pages/settings/SettingsPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SettingsPage/>
  );
}
