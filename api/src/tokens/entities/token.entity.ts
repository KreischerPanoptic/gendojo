import { Entity, Column, PrimaryColumn, Unique, BeforeInsert, BeforeUpdate, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ select: false }) // Скрываем токен из обычных выборок find()
  token: string;

  @Column()
  hint: string;

  @Index({ unique: true }) // Гарантируем, что для каждого типа сервиса только одна запись
  @Column({
    type: 'varchar',
    enum: ['huggingface', 'civitai']
  })
  type: 'huggingface' | 'civitai';

  @CreateDateColumn()
  created_at: Date;
  
  @UpdateDateColumn()
  updated_at: Date;

  @BeforeInsert()
  @BeforeUpdate()
  updateHint() {
    if (this.token) {
      // Берем последние 4 символа или меньше, если токен короткий
      this.hint = this.token.length > 4 ? this.token.slice(-4) : this.token;
    }
  }
}