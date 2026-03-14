import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity('dataset_metas')
export class DatasetMetadata {
  /** Matches the dataset directory name — acts as natural PK */
  @PrimaryColumn()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  activationToken?: string;

  /** Detected caption style — set by analysis, editable by user */
  @Column({ default: 'unknown' })
  captionType: 'tag_list' | 'natural_language' | 'mixed' | 'unknown';

  /** Intended training resolution (informational — actual is in dataset.toml) */
  @Column({ type: 'integer', default: 1024 })
  resolution: number;

  /**
   * Cached image count — updated on upload/refresh.
   * Not the source of truth (filesystem is), but useful for quick queries.
   */
  @Column({ type: 'integer', default: 0 })
  imageCount: number;

  /** Tag → occurrence count, populated by caption analysis */
  @Column({ type: 'simple-json', nullable: true })
  tagFrequency: Record<string, number> | null;

  /** Number of tokens at the front of each caption to never shuffle */
  @Column({ type: 'integer', default: 0 })
  keep_tokens_count: number;

  /** Whether any caption files were found on last scan */
  @Column({ type: 'boolean', default: false })
  has_captions: boolean;

  /** Conceptual category of the dataset */
  @Column({ default: 'unknown' })
  type: 'unknown' | 'style' | 'character' | 'object' | 'concept' | 'clothing';

  @Column({ nullable: true })
  notes?: string;

  /**
   * Total byte size of all files in the dataset directory.
   * Using 'integer' instead of 'bigint' — SQLite returns bigint as string,
   * and dataset sizes fit comfortably within JS Number precision (< 2^53).
   */
  @Column({ type: 'integer', default: 0 })
  total_file_size: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}