import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Persisted user-created training preset.
 *
 * System presets (source='system') are defined statically in presets.data.ts
 * and are never stored in the database — they are always read from code.
 *
 * This entity only stores user presets (source='user').
 * The PresetsService merges system presets (from code) with user presets (from DB)
 * when returning the full list.
 */
@Entity('training_presets')
export class TrainingPreset {
  /**
   * UUID primary key.
   * Prefixed with "user-" at the service layer when exposed via API
   * so the UI can distinguish user vs system presets without a separate field.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Target architecture.
   * Must match one of the ModelArchitecture union values.
   * Not enforced at DB level — validated in PresetsService.
   */
  @Column()
  arch: string;

  /**
   * Preset quality tier.
   * For user presets this is typically 'custom', but users can choose
   * 'fast' / 'balanced' / 'quality' when saving a modified system preset.
   */
  @Column({ default: 'custom' })
  tier: string;

  /** Short display name shown in the preset selector */
  @Column()
  label: string;

  /** One-line description shown in the UI tooltip */
  @Column({ nullable: true })
  description?: string;

  /**
   * Partial training config stored as a JSON blob.
   * Contains only the training "knobs" — never model paths,
   * dataset_config, output_dir, or output_name.
   * Those are job-specific and must be supplied when creating a job.
   */
  @Column({ type: 'simple-json' })
  config: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}