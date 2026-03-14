import { ApiProperty } from "@nestjs/swagger";
import { LogLineDto } from "./log-line.dto";

export class JobLogsResponseDto {
  @ApiProperty({ type: [LogLineDto] })
  logs: LogLineDto[];
}