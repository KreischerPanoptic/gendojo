import { ApiProperty } from "@nestjs/swagger";
import { GpuInfoDto } from "./gpu-info.dto";

export class GpuSnapshotDto {
  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  timestamp: string;
 
  @ApiProperty({ type: [GpuInfoDto] })
  gpus: GpuInfoDto[];
}