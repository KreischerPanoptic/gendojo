import { ApiProperty } from "@nestjs/swagger";

export class CpuInfoDto {
  @ApiProperty({ description: 'CPU model string', example: 'AMD EPYC 7543 32-Core Processor' })
  model: string;
 
  @ApiProperty({
    description:
      'Number of logical CPU threads as reported by the OS (includes HyperThreading). ' +
      'On RunPod this reflects the vCPU count allocated to the pod.',
    example: 16,
  })
  logicalCores: number;
 
  @ApiProperty({ description: 'Aggregate CPU utilisation 0–100 (delta since last poll)', example: 42 })
  usedPercent: number;
 
  @ApiProperty({
    description: '1-minute, 5-minute, 15-minute load averages',
    type: [Number],
    minItems: 3,
    maxItems: 3,
    example: [2.4, 1.8, 1.2],
  })
  loadAvg: [number, number, number];
}