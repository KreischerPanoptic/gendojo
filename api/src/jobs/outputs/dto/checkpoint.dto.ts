import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CheckpointPreviewDto } from "./checkpoint-preview.dto";

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint — one .safetensors file in output_dir
//
// Filename conventions from sd-scripts:
//   {name}-{epoch:06d}e.safetensors   epoch save (SD1/SDXL/FLUX/SD3)
//   {name}-{epoch:06d}.safetensors    epoch save WITHOUT 'e' (Anima/Lumina/Hunyuan)
//   {name}-{step:08d}.safetensors     step save
//   {name}.safetensors                final checkpoint
// ─────────────────────────────────────────────────────────────────────────────
 
export class CheckpointDto {
  @ApiProperty({
    description:
      'Filename only — download via GET /jobs/:id/outputs/download/:filename',
    example: 'lora-000004e.safetensors',
  })
  filename: string;
 
  @ApiPropertyOptional({
    description: 'Epoch number — undefined for step saves and the final checkpoint',
    example: 4,
    nullable: true,
    type: Number,
  })
  epoch?: number;
 
  @ApiPropertyOptional({
    description: 'Step number — undefined for epoch saves and the final checkpoint',
    example: 500,
    nullable: true,
    type: Number,
  })
  step?: number;
 
  @ApiProperty({ description: 'File size in bytes', example: 393216000 })
  sizeBytes: number;
 
  @ApiProperty({
    description: 'ISO timestamp from filesystem mtime',
    example: '2026-03-08T22:30:00.000Z',
  })
  createdAt: string;
 
  @ApiProperty({
    description:
      'Preview images generated at this checkpoint. ' +
      'Empty when no sample_prompts was configured or sample generation has not run yet.',
    type: [CheckpointPreviewDto],
  })
  previews: CheckpointPreviewDto[];
}