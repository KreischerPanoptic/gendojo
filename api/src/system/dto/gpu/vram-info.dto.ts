import { ApiProperty } from '@nestjs/swagger';

export class VramInfoDto {
  @ApiProperty({ description: 'Total VRAM in MiB', example: 24576 })
  totalMiB: number;
 
  @ApiProperty({ description: 'Used VRAM in MiB', example: 18432 })
  usedMiB: number;
 
  @ApiProperty({ description: 'Free VRAM in MiB', example: 6144 })
  freeMiB: number;
 
  @ApiProperty({ description: 'VRAM utilisation 0–100', example: 75 })
  usedPercent: number;
}