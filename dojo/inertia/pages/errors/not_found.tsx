import { Title, Text, Button, Container, Group } from '@mantine/core'
import { IconHome } from '@tabler/icons-react'
import { Link } from '@adonisjs/inertia/react'

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center justify-center min-h-screen text-center">
      <Title className="text-9xl font-black text-gray-200 dark:text-gray-800">404</Title>
      <Title order={2} className="mt-4 text-2xl font-bold">
        You have found a secret place.
      </Title>
      <Text c="dimmed" size="lg" className="mt-4 max-w-125">
        Unfortunately, this is only a 404 page. You may have mistyped the address, or the page has
        been moved to another URL.
      </Text>
      <Group justify="center" className="mt-8">
        <Button component={Link} href="/" size="md" leftSection={<IconHome size={20} />}>
          Take me back to home page
        </Button>
      </Group>
    </Container>
  )
}
