import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  navigate({to: '/jobs'})

  return (
    <> 
    </>
  );
}
