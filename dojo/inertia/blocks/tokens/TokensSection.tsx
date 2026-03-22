import { useState } from 'react'
// eslint-disable-next-line @adonisjs/no-backend-import-in-frontend
import { TokenType } from '#contracts/enums'
import type { Data } from '@generated/data'
import { Stack, Divider } from '@mantine/core'
import { IconKey } from '@tabler/icons-react'
import SettingsSection from '../settings/SettingsSection'
import TokenRow from './TokenRow'
import { client } from '~/client'

export default function TokensSection({ tokens: initialTokens }: { tokens: Data.Token[] }) {
  const [tokens, setTokens] = useState<Data.Token[]>(initialTokens || [])

  const [savingKey, setSavingKey] = useState<TokenType | null>(null)
  const [clearingKey, setClearingKey] = useState<TokenType | null>(null)

  const handleSave = async (type: TokenType, value: string) => {
    setSavingKey(type)
    try {
      const { hint } = await client.api.settings.token.save({ body: { type, token: value } })

      setTokens((prev) => {
        const exists = prev.find((t) => t.type === type)
        if (exists) {
          return prev.map((t) => (t.type === type ? { ...t, hint: hint } : t))
        }
        return [...prev, { type, hint: hint }]
      })
    } catch (error) {
      console.error('Failed to save token:', error)
    } finally {
      setSavingKey(null)
    }
  }

  const handleClear = async (type: TokenType) => {
    setClearingKey(type)
    try {
      await client.api.settings.token.delete({ params: { type } })

      setTokens((prev) => prev.filter((t) => t.type !== type))
    } catch (error) {
      console.error('Failed to clear token:', error)
    } finally {
      setClearingKey(null)
    }
  }

  return (
    <SettingsSection
      icon={<IconKey size={16} />}
      title="API Tokens"
      description="Credentials for model downloads — stored on disk, never logged"
    >
      <Stack gap="md">
        <TokenRow
          label="HuggingFace Token"
          description="Required to download gated models (e.g. FLUX.1-dev). Get yours at huggingface.co/settings/tokens"
          hint={tokens.find((t) => t.type === TokenType.HF)?.hint ?? null}
          isSet={!!tokens.find((t) => t.type === TokenType.HF)}
          tokenType={TokenType.HF}
          onSave={handleSave}
          onClear={handleClear}
          saving={savingKey === TokenType.HF}
          clearing={clearingKey === TokenType.HF}
        />
        <Divider />
        <TokenRow
          label="CivitAI Token"
          description="Required to download models from CivitAI. Get yours at civitai.com/user/account"
          hint={tokens.find((t) => t.type === TokenType.CAI)?.hint ?? null}
          isSet={!!tokens.find((t) => t.type === TokenType.CAI)}
          tokenType={TokenType.CAI}
          onSave={handleSave}
          onClear={handleClear}
          saving={savingKey === TokenType.CAI}
          clearing={clearingKey === TokenType.CAI}
        />
      </Stack>
    </SettingsSection>
  )
}
