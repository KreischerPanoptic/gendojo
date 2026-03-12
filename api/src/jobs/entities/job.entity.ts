import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { JobStatus } from '../types/jobs.types';

@Entity('jobs')
export class Job {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  arch: string;

  @Column({ nullable: true })
  datasetName?: string;

  @Column()
  jobDir: string;

  @Column()
  datasetTomlPath: string;

  @Column()
  trainTomlPath: string;

  @Column()
  logFilePath: string;

  @Column()
  script: string;

  @Column()
  command: string;

  @Column({ type: 'varchar', default: JobStatus.Pending })
  status: JobStatus;

  @Column({ nullable: true })
  exitCode?: number;

  @Column()
  outputDir: string;

  @Column({ nullable: true })
  samplePromptsPath?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  finishedAt?: Date;

  @Column({ type: 'float', nullable: true })
  finalLoss?: number;

  @Column({ nullable: true })
  totalSteps?: number;
}