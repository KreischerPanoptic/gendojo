import { ApiProperty } from "@nestjs/swagger";

export class RefreshResponseDto {
  @ApiProperty({ description: 'Number of model files found after re-scan', example: 12 })
  count: number;
}