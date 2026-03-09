import type { ModelArchitecture } from '../../models/entities/models.types';
import type { BaseTrainDto } from '../../toml/dto/train-toml.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Preset tier
// ─────────────────────────────────────────────────────────────────────────────

export type PresetTier = 'fast' | 'balanced' | 'quality' | 'custom';

export const PRESET_TIER_LABEL: Record<PresetTier, string> = {
  fast:     'Fast',
  balanced: 'Balanced',
  quality:  'Quality',
  custom:   'Custom',
};

// ─────────────────────────────────────────────────────────────────────────────
// Preset config
//
// Contains only the training "knobs" — never model paths, never
// dataset_config / output_dir / output_name (those are job-specific).
// ─────────────────────────────────────────────────────────────────────────────

type ExcludedBaseFields =
  | 'pretrained_model_name_or_path'
  | 'dataset_config'
  | 'output_dir'
  | 'output_name';

export type PresetConfig = Partial<Omit<BaseTrainDto, ExcludedBaseFields>> &
  Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Preset record
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingPreset {
  /** Stable ID. System: "flux-balanced". User: "user-{uuid}" */
  id: string;
  arch: ModelArchitecture;
  tier: PresetTier;
  /** Short display name */
  label: string;
  /** One-line description shown in the UI tooltip */
  description: string;
  /**
   * Origin. System presets ship with the app; user presets are saved to disk.
   * Always present in responses, never sent in create/update DTOs.
   */
  source: 'system' | 'user';
  /** ISO timestamp — only set for user presets */
  createdAt?: string;
  /** ISO timestamp — only set for user presets */
  updatedAt?: string;
  /** Partial training config merged onto the job DTO by the UI/API consumer */
  config: PresetConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Body for POST /presets */
export interface CreatePresetDto {
  arch: ModelArchitecture;
  tier?: PresetTier;
  label: string;
  description?: string;
  config: PresetConfig;
}

/** Body for PUT /presets/:id — all fields optional */
export interface UpdatePresetDto {
  label?: string;
  description?: string;
  config?: PresetConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────────────────────────────────────

export type PresetsGrouped = Partial<Record<ModelArchitecture, TrainingPreset[]>>;