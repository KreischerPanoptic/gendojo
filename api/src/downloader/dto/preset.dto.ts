import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { DownloadSource } from "../types/downloader.types";

export class PresetDto {
  @ApiProperty({ example: 'flux-dev-dit' })
  id: string;

  @ApiProperty({ example: 'FLUX.1-dev (DiT)' })
  name: string;

  @ApiProperty({ example: 'flux' })
  arch: string;

  @ApiProperty({ example: 'dit' })
  role: string;

  @ApiProperty({ enum: ['huggingface', 'civitai', 'direct'] })
  source: DownloadSource;

  @ApiPropertyOptional({ example: 23800, nullable: true, type: Number })
  sizeMb?: number;

  @ApiProperty({ description: 'Whether a HuggingFace account token is required (gated model)', example: true })
  requiresHfToken: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  description?: string;

  @ApiPropertyOptional({
    description:
      'When set, this preset saves to models/<sharedDestination> instead of the ' +
      'arch-specific directory. Multiple presets with the same value point to the ' +
      'same file on disk — downloading any one of them satisfies all.',
    example: 'shared/ae/ae.safetensors',
    nullable: true,
    type: String,
  })
  sharedDestination?: string;
}