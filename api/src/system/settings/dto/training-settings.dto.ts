import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class TrainingSettingsDto {
  /**
   * Maximum number of jobs allowed to run simultaneously.
   * RunPod pods typically have 1 GPU — keep at 1.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  maxConcurrentJobs?: number;

  /**
   * Maximum log lines kept in memory per job.
   * Older lines are dropped (ring buffer). Persisted log file is unlimited.
   */
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(20000)
  logBufferSize?: number;

  /**
   * Value passed to accelerate --num_cpu_threads_per_process.
   * Set to the number of CPU cores available (or 1 to let accelerate decide).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  cpuThreadsPerProcess?: number;
}