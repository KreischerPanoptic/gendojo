import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryColumn({ default: 'GLOBAL_CONFIG' })
  id: string = 'GLOBAL_CONFIG';

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
  
  @Column()
  maxConcurrentJobs?: number;

  @Column()
  logBufferSize?: number;

  @Column()
  cpuThreadsPerProcess?: number;

  @Column({ default: 'auto' })
  theme: 'dark' | 'light' | 'auto'
}
