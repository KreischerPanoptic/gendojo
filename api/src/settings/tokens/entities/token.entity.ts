import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * AES-256-GCM encrypted token value.
   * Format: `{iv_hex}:{authTag_hex}:{ciphertext_hex}`
   *
   * `select: false` ensures token is never included in ordinary find() results.
   * Must be explicitly selected when decryption is needed:
   *   repo.findOne({ where: { type }, select: ['id', 'type', 'hint', 'token'] })
   */
  @Column({ select: false })
  token: string;

  /**
   * Last 4 characters of the raw token — computed in the service BEFORE
   * encryption and stored as a display hint for the UI.
   * e.g. "...f3aB"
   */
  @Column()
  hint: string;

  /**
   * One record per service type — enforced by unique index.
   * upsert logic in the service uses this to overwrite existing tokens.
   */
  @Index({ unique: true })
  @Column()
  type: 'huggingface' | 'civitai';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}