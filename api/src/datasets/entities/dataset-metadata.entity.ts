import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';


@Entity('dataset-metas')
export class DatasetMetadata {
  @PrimaryColumn()
  name: string;

  @Column()
  description?: string;

  @Column()
  activationToken?: string;

  @Column({default: 'unknown'})
  captionType: 'tag_list' | 'natural_language' | 'mixed' | 'unknown';

  @Column({ type: 'int', default: 1024 })
  resolution: number;

  @Column({ type: 'int', default: 0 })
  imageCount: number;

  @Column({ type: 'json', nullable: true })
  tagFrequency: Record<string, number>;

  @Column({ type: 'int', default: 0 })
  keep_tokens_count: number;

  @Column({ type: 'bool', default: false })
  has_captions: boolean;

  @Column({ default: 'unknown' })
  type: 'unknown' | 'style' | 'character' | 'object' | 'concept' | 'clothing';

  @Column()
  notes?: string;

  @Column({ type: 'bigint' })
  total_file_size: number

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}