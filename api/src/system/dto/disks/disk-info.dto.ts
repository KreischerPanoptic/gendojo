import { ApiProperty } from "@nestjs/swagger";

export class DiskInfoDto {
  @ApiProperty({ description: 'Block device path', example: '/dev/sda1' })
  source: string;
 
  @ApiProperty({ description: 'Mount point', example: '/workspace' })
  mountpoint: string;
 
  @ApiProperty({ description: 'Total capacity in bytes', example: 107374182400 })
  totalBytes: number;
 
  @ApiProperty({ description: 'Used space in bytes', example: 64424509440 })
  usedBytes: number;
 
  @ApiProperty({ description: 'Available space in bytes', example: 42949672960 })
  availableBytes: number;
 
  @ApiProperty({ description: 'Disk utilisation 0–100', example: 60 })
  usedPercent: number;
}