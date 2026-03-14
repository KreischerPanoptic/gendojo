import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JobStatus } from "../types/jobs.types";

export class KillJobResponseDto {
  @ApiProperty({ description: 'Whether SIGTERM was delivered to the process group', example: true })
  killed: boolean;

  @ApiPropertyOptional({ enum: JobStatus, description: 'Job status after kill attempt', example: JobStatus.Killed })
  status?: JobStatus;
}