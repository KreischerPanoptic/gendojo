import { ApiProperty } from "@nestjs/swagger";
import { DiskInfoDto } from "./disk-info.dto";

export class DisksSnapshotDto {
  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  timestamp: string;
 
  @ApiProperty({ type: [DiskInfoDto] })
  disks: DiskInfoDto[];
}