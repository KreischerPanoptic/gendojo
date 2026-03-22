import type { TokenType } from '#contracts/enums'

export const settingsQueryKeys = {
  theme: ['settings', 'theme'] as const,
  tokens: ['settings', 'tokens'] as const,
  token: (type: TokenType) => ['settings', 'token', type] as const,
  training: ['settings', 'training'] as const,
  paths: ['settings', 'paths'] as const,
}
