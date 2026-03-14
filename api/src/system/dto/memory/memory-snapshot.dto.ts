import { ApiProperty } from "@nestjs/swagger";
import { MemoryInfoDto } from "./memory-info.dto";

export class MemorySnapshotDto {
  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  timestamp: string;
 
  @ApiProperty({ type: () => MemoryInfoDto })
  memory: MemoryInfoDto;
}