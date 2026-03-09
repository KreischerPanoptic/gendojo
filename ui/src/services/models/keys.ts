import type { ModelArchitecture } from './types'

export const modelsQueryKeys = {
  all:         ['models']                                        as const,
  detail:      (id: string) => ['models', id]                   as const,
  readiness:   (arch: ModelArchitecture) => ['models', 'readiness', arch] as const,
  integrity:   (id: string) => ['models', 'integrity', id]      as const,
  archPreview: (arch: ModelArchitecture) => ['models', 'arch-preview', arch] as const,
}