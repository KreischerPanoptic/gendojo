import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, ValidateIf } from "class-validator";
import type { ModelArchitecture, ModelRole } from "src/models/types/models.types";

/**
 * POST /downloader
 *
 * Provide EITHER `presetId` OR (`url` + `arch` + `role`).
 * `filename` is optional in both modes — defaults to the last URL path segment.
 */
export class StartDownloadDto {
  @ApiPropertyOptional({
    description:
      'Use a built-in preset — all other fields are inferred. ' +
      'List available presets via GET /downloader/presets.',
    example: 'flux-dev-dit',
  })
  @IsOptional()
  @IsString()
  presetId?: string;

  @ApiPropertyOptional({
    description:
      'Direct URL to download from. Required when presetId is not provided. ' +
      'Supported: huggingface.co resolve links, civitai.com/api/download/*, any direct HTTPS link.',
    example: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
  })
  @ValidateIf((o: StartDownloadDto) => !o.presetId)
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Model architecture. Required when presetId is not provided.',
    example: 'flux',
  })
  @ValidateIf((o: StartDownloadDto) => !o.presetId)
  @IsString()
  arch?: ModelArchitecture;

  @ApiPropertyOptional({
    description: 'Model role. Required when presetId is not provided.',
    example: 'dit',
  })
  @ValidateIf((o: StartDownloadDto) => !o.presetId)
  @IsString()
  role?: ModelRole;

  @ApiPropertyOptional({
    description: 'Desired filename on disk. Defaults to the last path segment of the URL.',
    example: 'flux1-dev.safetensors',
  })
  @IsOptional()
  @IsString()
  filename?: string;
}