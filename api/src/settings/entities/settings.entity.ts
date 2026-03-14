import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  /**
   * Single-row config table — always keyed to 'GLOBAL_CONFIG'.
   * Using a string PK instead of a surrogate integer makes the intent explicit
   * and avoids accidental duplicate rows.
   */
  @PrimaryColumn()
  id: string = 'GLOBAL_CONFIG';

  // ── Paths ─────────────────────────────────────────────────────────────────

  @Column()
  modelsPath: string;

  @Column()
  datasetsPath: string;

  @Column()
  outputsPath: string;

  @Column()
  logsPath: string;

  @Column()
  sdScriptsPath: string;

  @Column()
  accelerateConfigPath: string;

  @Column()
  tempPath: string;

  // ── Training constants ────────────────────────────────────────────────────

  /**
   * Maximum number of training jobs that can run concurrently.
   * Enforced in JobsService before spawning a new accelerate process.
   */
  @Column({ type: 'integer', default: 1 })
  maxConcurrentJobs: number;

  /**
   * Size of the in-memory log ring buffer (lines) per job.
   * Older lines are evicted when the buffer is full.
   */
  @Column({ type: 'integer', default: 2000 })
  logBufferSize: number;

  /**
   * Value passed to accelerate --num_cpu_threads_per_process.
   * Higher values improve data loading throughput at the cost of CPU contention.
   */
  @Column({ type: 'integer', default: 2 })
  cpuThreadsPerProcess: number;

  // ── UI ────────────────────────────────────────────────────────────────────

  @Column({ default: 'auto' })
  theme: 'dark' | 'light' | 'auto';
}