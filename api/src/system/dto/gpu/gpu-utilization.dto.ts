import { ApiProperty } from '@nestjs/swagger';
 
export class GpuUtilizationDto {
  @ApiProperty({ description: 'GPU core utilisation 0–100', example: 98 })
  gpuPercent: number;
 
  @ApiProperty({ description: 'GPU memory controller utilisation 0–100', example: 80 })
  memoryPercent: number;
}