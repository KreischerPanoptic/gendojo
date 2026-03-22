import { Title, Text, Button, Container, Group } from '@mantine/core'
import { IconRefresh } from '@tabler/icons-react'

export default function ServerError() {
  //({ error }: { error?: any }) {
  return (
    <Container className="flex flex-col items-center justify-center min-h-screen text-center">
      <Title className="text-9xl font-black text-gray-200 dark:text-gray-800">500</Title>
      <Title order={2} className="mt-4 text-2xl font-bold">
        Something bad just happened...
      </Title>
      <Text c="dimmed" size="lg" className="mt-4 max-w-125">
        Our servers could not handle your request. Don't worry, our development team was already
        notified. Try refreshing the page.
      </Text>
      <Group justify="center" className="mt-8">
        <Button
          size="md"
          variant="outline"
          leftSection={<IconRefresh size={20} />}
          onClick={() => window.location.reload()}
        >
          Refresh the page
        </Button>
      </Group>
    </Container>
  )
}
