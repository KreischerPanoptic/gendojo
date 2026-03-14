import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class TrainingSettingsDto {
  @ApiPropertyOptional({
    description: 'Maximum number of training jobs that can run concurrently',
    example: 1,
    minimum: 1,
    maximum: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  maxConcurrentJobs?: number;

  @ApiPropertyOptional({
    description: 'Size of the in-memory log ring buffer per job (lines). Older lines are evicted when full.',
    example: 2000,
    minimum: 100,
    maximum: 20000,
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(20000)
  logBufferSize?: number;

  @ApiPropertyOptional({
    description: 'Value passed to accelerate --num_cpu_threads_per_process',
    example: 2,
    minimum: 1,
    maximum: 64,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  cpuThreadsPerProcess?: number;
}