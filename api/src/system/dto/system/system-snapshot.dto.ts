import { ApiProperty } from "@nestjs/swagger";
import { GpuInfoDto } from "../gpu";
import { CpuInfoDto } from "../cpu";
import { MemoryInfoDto } from "../memory";
import { DiskInfoDto } from "../disks";

export class SystemSnapshotDto {
  @ApiProperty({ description: 'ISO timestamp of when this snapshot was collected', example: '2026-03-08T22:00:00.000Z' })
  timestamp: string;
 
  @ApiProperty({ description: 'Pod hostname', example: 'runpod-gpu-abc123' })
  hostname: string;
 
  @ApiProperty({ description: 'System uptime in seconds', example: 86400 })
  uptime: number;
 
  @ApiProperty({
    description: 'GPU info for each detected NVIDIA GPU. Empty array when nvidia-smi is unavailable.',
    type: [GpuInfoDto],
  })
  gpus: GpuInfoDto[];
 
  @ApiProperty({ type: () => CpuInfoDto })
  cpu: CpuInfoDto;
 
  @ApiProperty({ type: () => MemoryInfoDto })
  memory: MemoryInfoDto;
 
  @ApiProperty({ type: [DiskInfoDto] })
  disks: DiskInfoDto[];
}