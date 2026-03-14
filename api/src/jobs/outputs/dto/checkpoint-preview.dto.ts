import { ApiProperty } from "@nestjs/swagger";

export class CheckpointPreviewDto {
  @ApiProperty({
    description: 'Filename only — serve via GET /jobs/:id/outputs/previews/:filename',
    example: 'lora_e000004_01_20260308225827.png',
  })
  filename: string;
 
  @ApiProperty({
    description: '0-based index into the prompts array for this job',
    example: 1,
  })
  promptIndex: number;
}