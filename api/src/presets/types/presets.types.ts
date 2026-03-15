import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsObject,
  MaxLength,
} from 'class-validator';
import type { ModelArchitecture } from '../../models/types/models.types';
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
// Preset config type
//
// Contains only training "knobs" — never model paths, dataset_config,
// output_dir, or output_name (those are job-specific).
// ─────────────────────────────────────────────────────────────────────────────

type ExcludedBaseFields =
  | 'pretrained_model_name_or_path'
  | 'dataset_config'
  | 'output_dir'
  | 'output_name';

export type PresetConfig = Partial<Omit<BaseTrainDto, ExcludedBaseFields>> &
  Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// TrainingPreset — response shape
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingPreset {
  /**
   * Stable unique identifier.
   * System presets: e.g. "flux-balanced".
   * User presets:   e.g. "user-{uuid}".
   */
  id: string;
  arch: ModelArchitecture;
  tier: PresetTier;
  /** Short display name */
  label: string;
  /** One-line description shown in the UI tooltip */
  description: string;
  /**
   * Origin of this preset.
   * - 'system': ships with GenDojo, read-only, never stored in DB
   * - 'user':   created/saved by the user, stored in `training_presets` table
   */
  source: 'system' | 'user';
  /** ISO timestamp — only present for user presets */
  createdAt?: string;
  /** ISO timestamp — only present for user presets */
  updatedAt?: string;
  /** Partial training config merged onto the job DTO by the consumer */
  config: PresetConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class CreatePresetDto {
  @ApiProperty({
    description: 'Target model architecture',
    enum: ['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan'],
    example: 'flux',
  })
  @IsString()
  @IsIn(['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan'])
  arch: ModelArchitecture;

  @ApiPropertyOptional({
    description: 'Preset quality tier',
    enum: ['fast', 'balanced', 'quality', 'custom'],
    default: 'custom',
    example: 'custom',
  })
  @IsOptional()
  @IsIn(['fast', 'balanced', 'quality', 'custom'])
  tier?: PresetTier;

  @ApiProperty({
    description: 'Short display name shown in the preset selector',
    example: 'My FLUX character preset',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label: string;

  @ApiPropertyOptional({
    description: 'One-line description shown in the UI tooltip',
    example: 'Tweaked Balanced preset with noise_offset for portrait training',
    maxLength: 200,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({
    description:
      'Partial training config. Include only training "knobs" — ' +
      'model paths, dataset_config, output_dir and output_name must NOT be included ' +
      '(they are job-specific and are supplied when creating a job).',
    example: {
      network_dim: 16,
      network_alpha: 8,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      mixed_precision: 'bf16',
      gradient_checkpointing: true,
      cache_latents: true,
      max_train_epochs: 10,
    },
  })
  @IsObject()
  config: PresetConfig;
}

export class UpdatePresetDto {
  @ApiPropertyOptional({
    description: 'New display name',
    example: 'My updated FLUX preset',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional({
    description: 'New description',
    example: 'Better noise offset for portrait training',
    maxLength: 200,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Partial training config override. Only provided fields are updated.',
    example: { learning_rate: 5e-5, max_train_epochs: 15 }
  })
  @IsOptional()
  @IsObject()
  config?: PresetConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTO
// ─────────────────────────────────────────────────────────────────────────────

export class TrainingPresetDto {
  @ApiProperty({
    description:
      'Stable unique identifier. ' +
      'System presets: "flux-balanced". User presets: "user-{uuid}".',
    example: 'flux-balanced',
  })
  id: string;

  @ApiProperty({
    enum: ['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan'],
    example: 'flux',
  })
  arch: string;

  @ApiProperty({
    enum: ['fast', 'balanced', 'quality', 'custom'],
    description: 'Quality tier',
    example: 'balanced',
  })
  tier: string;

  @ApiProperty({ description: 'Short display name', example: 'Balanced' })
  label: string;

  @ApiProperty({
    description: 'One-line description for the UI tooltip',
    example: 'Recommended starting point for FLUX.1 LoRA on 24 GB VRAM.',
  })
  description: string;

  @ApiProperty({
    enum: ['system', 'user'],
    description:
      '"system" — ships with GenDojo, read-only. ' +
      '"user" — saved by the user, can be edited/deleted.',
    example: 'system',
  })
  source: 'system' | 'user';

  @ApiPropertyOptional({
    description: 'ISO creation timestamp — present only for user presets',
    example: '2026-03-08T12:00:00.000Z',
    nullable: true,
    type: String,
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'ISO last-updated timestamp — present only for user presets',
    example: '2026-03-09T15:30:00.000Z',
    nullable: true,
    type: String,
  })
  updatedAt?: string;

  @ApiProperty({
    description:
      'Partial training config. Merge this onto a job DTO to apply the preset. ' +
      'Model paths, dataset_config, output_dir and output_name are never included.',
    example: {
      network_dim: 16,
      network_alpha: 8,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      mixed_precision: 'bf16',
      gradient_checkpointing: true,
    },
  })
  config: PresetConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouped response
// ─────────────────────────────────────────────────────────────────────────────

export type PresetsGrouped = Partial<Record<ModelArchitecture, TrainingPreset[]>>;