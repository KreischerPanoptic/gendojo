import { ApiProperty } from '@nestjs/swagger';

export class PowerInfoDto {
  @ApiProperty({
    description: 'Current power draw in Watts. null when the GPU does not expose this metric.',
    example: 420.5,
    nullable: true,
    type: Number,
  })
  drawWatts: number | null;
 
  @ApiProperty({
    description: 'Configured power limit in Watts. null when unavailable.',
    example: 450.0,
    nullable: true,
    type: Number,
  })
  limitWatts: number | null;
}