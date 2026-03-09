import type { ModelArchitecture } from '@services/models'
import type { PresetTier } from './types'

export const presetsQueryKeys = {
  all:     ['presets'] as const,
  list:    (arch?: ModelArchitecture, tier?: PresetTier, source?: 'system' | 'user') =>
             ['presets', 'list', arch, tier, source] as const,
  grouped: (arch?: ModelArchitecture) =>
             ['presets', 'grouped', arch] as const,
  detail:  (id: string) =>
             ['presets', id] as const,
}