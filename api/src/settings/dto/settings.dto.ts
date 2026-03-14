import { ApiProperty } from '@nestjs/swagger';

export class SettingsDto {
  @ApiProperty({ description: 'Always "GLOBAL_CONFIG" — single-row config table', example: 'GLOBAL_CONFIG' })
  id: string;

  @ApiProperty({ description: 'Absolute path to the models volume', example: '/workspace/models' })
  modelsPath: string;

  @ApiProperty({ description: 'Absolute path to the datasets volume', example: '/workspace/datasets' })
  datasetsPath: string;

  @ApiProperty({ description: 'Absolute path to the training outputs volume', example: '/workspace/outputs' })
  outputsPath: string;

  @ApiProperty({ description: 'Absolute path to the logs root directory', example: '/workspace/logs' })
  logsPath: string;

  @ApiProperty({ description: 'Absolute path to the sd-scripts git submodule', example: '/app/sd-scripts' })
  sdScriptsPath: string;

  @ApiProperty({
    description: 'Absolute path to the accelerate config YAML',
    example: '/app/config_files/accelerate/runpod.yaml',
  })
  accelerateConfigPath: string;

  @ApiProperty({ description: 'Absolute path to the temp directory root', example: '/workspace/temp' })
  tempPath: string;

  @ApiProperty({
    description: 'Maximum number of training jobs that can run concurrently',
    example: 1,
    minimum: 1,
    maximum: 8,
  })
  maxConcurrentJobs: number;

  @ApiProperty({
    description: 'Size of the in-memory log ring buffer per job (lines)',
    example: 2000,
    minimum: 100,
    maximum: 20000,
  })
  logBufferSize: number;

  @ApiProperty({
    description: 'Value passed to accelerate --num_cpu_threads_per_process',
    example: 2,
    minimum: 1,
    maximum: 64,
  })
  cpuThreadsPerProcess: number;

  @ApiProperty({ enum: ['dark', 'light', 'auto'], description: 'UI colour theme', example: 'auto' })
  theme: 'dark' | 'light' | 'auto';
}