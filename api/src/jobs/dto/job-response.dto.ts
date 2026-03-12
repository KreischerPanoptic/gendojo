import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../types/jobs.types';

// ─── Primitives ───────────────────────────────────────────────────────────────

export class LogLineDto {
  @ApiProperty({ description: 'Unix timestamp (ms)', example: 1710000000000 })
  ts: number;

  @ApiProperty({ enum: ['stdout', 'stderr'], example: 'stderr' })
  stream: 'stdout' | 'stderr';

  @ApiProperty({ description: 'Raw log line text', example: 'steps:  50%|██████    | 500/1000 [05:00<05:00,  1.67it/s, avr_loss=0.0821]' })
  text: string;
}

export class JobProgressDto {
  @ApiProperty({ example: 500 })
  step: number;

  @ApiProperty({ example: 1000 })
  totalSteps: number;

  @ApiProperty({ example: 50 })
  percent: number;

  @ApiProperty({ description: 'Throughput string from tqdm', example: '1.67it/s' })
  speed: string;

  @ApiProperty({ description: 'Elapsed time string', example: '05:00' })
  elapsed: string;

  @ApiProperty({ description: 'ETA string', example: '0:05:00' })
  eta: string;

  @ApiProperty({ example: 0.0821 })
  avrLoss: number;
}

// ─── Job summary (list endpoint) ─────────────────────────────────────────────
// Mirrors Job entity minus `command` and `script` (internal fields).

export class JobSummaryResponseDto {
  @ApiProperty({ format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'my-lora-v1' })
  name: string;

  @ApiProperty({ example: 'flux' })
  arch: string;

  @ApiPropertyOptional({ example: 'portraits-dataset' })
  datasetName?: string;

  @ApiProperty({ example: '/workspace/gendojo/jobs/a1b2c3d4' })
  jobDir: string;

  @ApiProperty({ example: '/workspace/gendojo/jobs/a1b2c3d4/dataset.toml' })
  datasetTomlPath: string;

  @ApiProperty({ example: '/workspace/gendojo/jobs/a1b2c3d4/train.toml' })
  trainTomlPath: string;

  @ApiProperty({ example: '/workspace/gendojo/jobs/a1b2c3d4/train.log' })
  logFilePath: string;

  @ApiProperty({ enum: JobStatus, example: JobStatus.Running })
  status: JobStatus;

  @ApiPropertyOptional({ example: 0 })
  exitCode?: number;

  @ApiProperty({ example: '/workspace/gendojo/outputs/my-lora-v1/a1b2c3d4-2024-03-15T10-00-00' })
  outputDir: string;

  @ApiPropertyOptional({ example: '/workspace/gendojo/jobs/a1b2c3d4/prompts.txt' })
  samplePromptsPath?: string;

  @ApiProperty({ example: '2024-03-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-03-15T10:00:05.000Z' })
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2024-03-15T11:30:00.000Z' })
  finishedAt?: Date;

  @ApiPropertyOptional({ description: 'Average loss from the last tqdm tick', example: 0.0821 })
  finalLoss?: number;

  @ApiPropertyOptional({ description: 'Total training steps completed', example: 1000 })
  totalSteps?: number;
}

// ─── Job detail (single job endpoint) ────────────────────────────────────────

export class JobDetailResponseDto extends JobSummaryResponseDto {
  @ApiProperty({
    description: 'Internal accelerate launch command (read-only reference)',
    example: 'accelerate launch --config_file /workspace/accelerate.yaml flux_train_network.py --config_file train.toml',
  })
  command: string;

  @ApiProperty({ description: 'Python training script filename', example: 'flux_train_network.py' })
  script: string;

  @ApiPropertyOptional({
    type: [LogLineDto],
    description: 'In-memory ring buffer (last N lines). Present only while job is Running.',
  })
  logBuffer?: LogLineDto[];
}

// ─── Kill response ────────────────────────────────────────────────────────────

export class KillJobResponseDto {
  @ApiProperty({ description: 'Whether SIGTERM was delivered to the process group', example: true })
  killed: boolean;

  @ApiPropertyOptional({ enum: JobStatus, description: 'Job status after kill attempt', example: JobStatus.Killed })
  status?: JobStatus;
}

// ─── Logs response ────────────────────────────────────────────────────────────

export class JobLogsResponseDto {
  @ApiProperty({ type: [LogLineDto] })
  logs: LogLineDto[];
}