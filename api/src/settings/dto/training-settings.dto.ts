import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class TrainingSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  maxConcurrentJobs?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(20000)
  logBufferSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  cpuThreadsPerProcess?: number;
}

// export interface TrainingSettingsDto {
//   maxConcurrentJobs?: number;
//   logBufferSize?: number;
//   cpuThreadsPerProcess?: number;
// }