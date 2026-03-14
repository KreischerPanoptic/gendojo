import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JobStatus } from "../types/jobs.types";

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
