import { useForm } from '@inertiajs/react'
import { TextInput, PasswordInput, Button, Text, Card, Flex } from '@mantine/core'
import { IconUser, IconLock } from '@tabler/icons-react'
import type { InertiaProps } from '~/types'

// ─────────────────────────────────────────────────────────────────────────────
// Server validation errors land in `errors` (shared by InertiaMiddleware).
// Inertia's useForm also populates `form.errors` after a failed POST —
// we read from `form.errors` which is populated from the 422 response.
// ─────────────────────────────────────────────────────────────────────────────

export default function Login({ errors }: InertiaProps) {
  const form = useForm({
    username: '',
    password: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/login')
  }

  return (
    <Flex w="100%" mih="100vh" align="center" justify="center" bg="var(--mantine-color-dark-8)">
      <Card
        w="100%"
        maw={480}
        miw={320}
        p="xl"
        radius="md"
        shadow="sm"
        withBorder
        bg="var(--mantine-color-dark-7)"
      >
        <Flex justify="center">
          <Text fw={700} size="xl" mb={18} mt={32}>
            Log In
          </Text>
        </Flex>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TextInput
            label="Username"
            placeholder="admin"
            autoComplete="username"
            leftSection={<IconUser size={16} stroke={1.5} />}
            inputWrapperOrder={['label', 'input', 'error']}
            mih={76}
            disabled={form.processing}
            value={form.data.username}
            onChange={(e) => form.setData('username', e.currentTarget.value)}
            error={form.errors.username && <span>{`${form.errors.username || errors?.username}`}</span>}
          />

          <PasswordInput
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            leftSection={<IconLock size={16} stroke={1.5} />}
            inputWrapperOrder={['label', 'input', 'error']}
            mih={76}
            disabled={form.processing}
            value={form.data.password}
            onChange={(e) => form.setData('password', e.currentTarget.value)}
            error={form.errors.password && <span>{`${form.errors.password || errors?.password}`}</span>}
          />

          <Button
            type="submit"
            fullWidth
            size="md"
            mt={8}
            color="orange"
            loading={form.processing}
            style={{ fontWeight: 600 }}
          >
            {form.processing ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </Flex>
  )
}
