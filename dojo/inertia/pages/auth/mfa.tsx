import { useForm } from '@inertiajs/react'
import { PinInput, Button, Text, Card, Flex, Stack } from '@mantine/core'
import { IconShieldLock } from '@tabler/icons-react'
import type { InertiaProps } from '~/types'

// ─────────────────────────────────────────────────────────────────────────────
// Reached only mid-login when isMfaEnabled = true.
// Session holds `mfa_pending_user_id`; user is NOT authenticated yet.
// flash.error is populated by SessionController.mfaStore on invalid token.
// ─────────────────────────────────────────────────────────────────────────────

export default function Mfa({ flash }: InertiaProps) {
  const form = useForm({ token: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.data.token.length === 6) {
      form.post('/login/mfa')
    }
  }

  return (
    <Flex w="100%" mih="100vh" align="center" justify="center" bg="var(--mantine-color-dark-8)">
      <Card
        w="100%"
        maw={400}
        miw={300}
        p="xl"
        radius="md"
        shadow="sm"
        withBorder
        bg="var(--mantine-color-dark-7)"
      >
        <Stack align="center" gap="xs" mb={24} mt={16}>
          <IconShieldLock size={40} stroke={1.5} color="var(--mantine-color-orange-5)" />
          <Text fw={700} size="xl">
            Two-factor auth
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Enter the 6-digit code from your authenticator app
          </Text>
        </Stack>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Flex justify="center">
            <PinInput
              length={6}
              type="number"
              autoFocus
              disabled={form.processing}
              value={form.data.token}
              onChange={(value) => form.setData('token', value)}
              onComplete={() => form.post('/login/mfa')}
              error={!!flash?.error || !!form.errors.token}
            />
          </Flex>

          {(flash?.error || form.errors.token) && (
            <Text size="sm" ta="center" c="red">
              {flash?.error || form.errors.token}
            </Text>
          )}

          <Button
            type="submit"
            fullWidth
            size="md"
            color="orange"
            loading={form.processing}
            disabled={form.data.token.length < 6}
            style={{ fontWeight: 600 }}
          >
            Verify
          </Button>

          <Text size="xs" ta="center" c="dimmed">
            <a href="/login" style={{ color: 'inherit' }}>
              ← Back to login
            </a>
          </Text>
        </form>
      </Card>
    </Flex>
  )
}
