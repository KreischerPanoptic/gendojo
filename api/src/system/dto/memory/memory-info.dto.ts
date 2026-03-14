import { ApiProperty } from "@nestjs/swagger";

export class MemoryInfoDto {
  @ApiProperty({ description: 'Total RAM in bytes', example: 68719476736 })
  totalBytes: number;
 
  @ApiProperty({ description: 'Used RAM in bytes (total − available)', example: 51539607552 })
  usedBytes: number;
 
  @ApiProperty({ description: 'Free RAM in bytes (unallocated, excluding cache/buffers)', example: 1073741824 })
  freeBytes: number;
 
  @ApiProperty({ description: 'Available RAM in bytes (free + reclaimable cache)', example: 17179869184 })
  availableBytes: number;
 
  @ApiProperty({ description: 'Kernel I/O buffers in bytes', example: 536870912 })
  buffersBytes: number;
 
  @ApiProperty({ description: 'Page cache in bytes', example: 16106127360 })
  cachedBytes: number;
 
  @ApiProperty({ description: 'Memory utilisation 0–100 (based on available, not free)', example: 75 })
  usedPercent: number;
}