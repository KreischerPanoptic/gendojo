import { ApiProperty } from "@nestjs/swagger";

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