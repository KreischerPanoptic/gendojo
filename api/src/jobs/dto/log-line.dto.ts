import { ApiProperty } from "@nestjs/swagger";

export class LogLineDto {
  @ApiProperty({ description: 'Unix timestamp (ms)', example: 1710000000000 })
  ts: number;

  @ApiProperty({ enum: ['stdout', 'stderr'], example: 'stderr' })
  stream: 'stdout' | 'stderr';

  @ApiProperty({ description: 'Raw log line text', example: 'steps:  50%|██████    | 500/1000 [05:00<05:00,  1.67it/s, avr_loss=0.0821]' })
  text: string;
}