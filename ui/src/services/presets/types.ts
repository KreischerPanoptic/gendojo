// ─────────────────────────────────────────────────────────────────────────────
// Mirror of api/src/presets/entities/presets.types.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { ModelArchitecture } from '@services/models'

export type PresetTier = 'fast' | 'balanced' | 'quality' | 'custom'

export const PRESET_TIER_LABEL: Record<PresetTier, string> = {
  fast:     'Fast',
  balanced: 'Balanced',
  quality:  'Quality',
  custom:   'Custom',
}

export const PRESET_TIER_COLOR: Record<PresetTier, string> = {
  fast:     'teal',
  balanced: 'blue',
  quality:  'violet',
  custom:   'gray',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PresetConfig = Record<string, any>

export interface TrainingPreset {
  /** Stable ID: "flux-balanced" for system presets, "user-{uuid}" for user presets */
  id: string
  arch: ModelArchitecture
  tier: PresetTier
  label: string
  description: string
  source: 'system' | 'user'
  createdAt?: string
  updatedAt?: string
  config: PresetConfig
}

export type PresetsGrouped = Partial<Record<ModelArchitecture, TrainingPreset[]>>

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreatePresetDto {
  arch: ModelArchitecture
  tier?: PresetTier
  label: string
  description?: string
  config: PresetConfig
}

export interface UpdatePresetDto {
  label?: string
  description?: string
  config?: PresetConfig
}