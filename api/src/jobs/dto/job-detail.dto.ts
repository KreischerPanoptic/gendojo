import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JobSummaryResponseDto } from "./job-summary.dto";
import { LogLineDto } from "./log-line.dto";

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