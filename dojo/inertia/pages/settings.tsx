import { Stack, Group, Divider, Box, ThemeIcon, Title } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import AppearanceSection from '~/blocks/settings/AppearanceSection'
import PathsSection from '~/blocks/settings/PathsSection'
import type { InertiaProps } from '~/types'
import type { Data } from '@generated/data'
import { TrainingSection } from '~/blocks/settings/TrainingSection'
import TokensSection from '~/blocks/tokens/TokensSection'
import type { MfaData } from '~/types/mfa.types'
import MfaSection from '~/blocks/mfa/MfaSection'

// ─────────────────────────────────────────────────────────────────────────────

type PageProps = {
  mfa: MfaData
  settings: Data.Setting | null
  tokens: Data.Token[]
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Security({ mfa, settings, tokens }: InertiaProps<PageProps>) {
  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box
        p="xs"
        pb="xs"
        className="bg-(--gd-surface-tint)!"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        visibleFrom="sm"
      >
        <Group gap="sm" align="center">
          <ThemeIcon size={28} variant="transparent" color="orange">
            <IconSettings size={20} />
          </ThemeIcon>
          <Title order={3}>Settings</Title>
        </Group>
      </Box>

      {/* Content */}
      <Box p="lg" style={{ overflowY: 'auto', flex: 1 }}>
        <Stack gap="xl" maw={640}>
          {settings && (
            <>
              <AppearanceSection theme={settings?.theme.theme} />
              <Divider />
            </>
          )}
          <TokensSection tokens={tokens} />
          <Divider />
          {settings && (
            <>
              <PathsSection {...settings.paths} />
              <Divider />
            </>
          )}
          {settings && (
            <>
              <TrainingSection {...settings?.training} />
              <Divider />
            </>
          )}
          {mfa && <MfaSection {...mfa} />}
        </Stack>
      </Box>
    </Stack>
  )
}
