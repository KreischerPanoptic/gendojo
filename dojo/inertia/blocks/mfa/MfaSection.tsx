import { useState } from 'react'
import {
  IconCheck,
  IconCopy,
  IconShield,
  IconShieldCheck,
  IconShieldLock,
  IconShieldOff,
} from '@tabler/icons-react'
import SettingsSection from '../settings/SettingsSection'
import {
  Badge,
  Text,
  Alert,
  Button,
  Stack,
  Group,
  Code,
  CopyButton,
  Tooltip,
  ActionIcon,
  Image,
  PinInput,
} from '@mantine/core'
import type { MfaData } from '~/types/mfa.types'
import { client } from '~/client'

export default function MfaSection({
  isMfaEnabled: initialMfaEnabled,
  qrData: initialQrData,
}: MfaData) {
  // Local state to completely bypass Inertia prop refreshes
  const [isMfaEnabled, setIsMfaEnabled] = useState(initialMfaEnabled)
  const [qrData, setQrData] = useState(initialQrData)

  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  // Loading states
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)

  const handleSetup = async () => {
    setIsSettingUp(true)
    setError('')
    try {
      // Fetch fresh QR code & secret from the backend
      const response = await client.api.mfa.setup({})
      if (response) {
        const { qrCode, secret, url } = response
        setQrData({ qrCode, secret, url })
      }
    } catch (err) {
      console.error(err)
      setError('Failed to set up MFA. Please try again.')
    } finally {
      setIsSettingUp(false)
    }
  }

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsEnabling(true)
    setError('')
    try {
      await client.api.mfa.enable({ body: { token } })

      // Instantly update UI on success
      setIsMfaEnabled(true)
      setQrData(null) // Clear the setup data
      setToken('')
      // biome-ignore lint/suspicious/noExplicitAny: Clash with another rule
    } catch (err: any) {
      // Grab the custom error message we set in the controller, or default to a generic one
      setError(err.response?.data?.error || 'Invalid or expired code')
    } finally {
      setIsEnabling(false)
    }
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDisabling(true)
    try {
      await client.api.mfa.disable({})

      // Instantly update UI on success
      setIsMfaEnabled(false)
      setQrData(null)
      setToken('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsDisabling(false)
    }
  }

  return (
    <SettingsSection
      icon={<IconShield size={16} />}
      title="Two-factor authentication"
      description="Adds a second verification step on login using a TOTP authenticator app"
      badge={
        isMfaEnabled ? (
          <Badge color="green" variant="light">
            Enabled
          </Badge>
        ) : (
          <Badge color="gray" variant="light">
            Disabled
          </Badge>
        )
      }
    >
      {/* ── State: MFA is Enabled ─────────────────────────── */}
      {isMfaEnabled ? (
        <form onSubmit={handleDisable}>
          <Button
            type="submit"
            color="red"
            variant="light"
            leftSection={<IconShieldOff size={16} />}
            loading={isDisabling}
          >
            Disable MFA
          </Button>
        </form>
      ) : null}

      {/* ── State: Setup started, showing QR Code ─────────────────────────── */}
      {!isMfaEnabled && qrData && (
        <Stack gap="md">
          <Alert color="orange" variant="light">
            Scan the QR code with your authenticator app, then enter the 6-digit code below to
            confirm and activate MFA.
          </Alert>

          <Image
            src={qrData.qrCode}
            alt="MFA QR Code"
            w={180}
            h={180}
            radius="sm"
            style={{ imageRendering: 'pixelated' }}
          />

          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Manual entry secret
            </Text>
            <Group gap="xs">
              <Code fz="sm">{qrData.secret}</Code>
              <CopyButton value={qrData.secret} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy secret'} withArrow>
                    <ActionIcon
                      variant="subtle"
                      color={copied ? 'green' : 'gray'}
                      onClick={copy}
                      size="sm"
                    >
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Stack>

          <form
            onSubmit={handleEnable}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <PinInput
              length={6}
              type="number"
              autoFocus
              disabled={isEnabling}
              value={token}
              onChange={(val) => setToken(val.replace(/\D/g, ''))}
            />

            {error && (
              <Text size="xs" c="red">
                {error}
              </Text>
            )}

            <Button
              type="submit"
              color="orange"
              w="fit-content"
              leftSection={<IconShieldCheck size={16} />}
              loading={isEnabling}
              disabled={token.length < 6}
            >
              Confirm & enable
            </Button>
          </form>
        </Stack>
      )}

      {/* ── State: No secret, MFA not started ─────────────────────────── */}
      {!isMfaEnabled && !qrData && (
        <Button
          type="button" // Changed from form submit to simple button click
          onClick={handleSetup}
          color="orange"
          variant="light"
          leftSection={<IconShieldLock size={16} />}
          loading={isSettingUp}
        >
          Set up MFA
        </Button>
      )}
    </SettingsSection>
  )
}
