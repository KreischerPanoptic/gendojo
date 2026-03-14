import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Used both as:
 *   - Response body for GET /settings/paths (all fields present)
 *   - Nested inside UpdateSettingsDto for PUT /settings (all fields optional)
 */
export class PathsDto {
  @ApiPropertyOptional({ description: 'Absolute path to the models volume', example: '/workspace/models' })
  @IsOptional()
  @IsString()
  models?: string;

  @ApiPropertyOptional({ description: 'Absolute path to the datasets volume', example: '/workspace/datasets' })
  @IsOptional()
  @IsString()
  datasets?: string;

  @ApiPropertyOptional({ description: 'Absolute path to the training outputs volume', example: '/workspace/outputs' })
  @IsOptional()
  @IsString()
  outputs?: string;

  @ApiPropertyOptional({ description: 'Absolute path to the logs root directory', example: '/workspace/logs' })
  @IsOptional()
  @IsString()
  logs?: string;

  @ApiPropertyOptional({ description: 'Absolute path to the sd-scripts git submodule', example: '/app/sd-scripts' })
  @IsOptional()
  @IsString()
  sdScripts?: string;

  @ApiPropertyOptional({
    description: 'Absolute path to the accelerate config YAML',
    example: '/app/config_files/accelerate/runpod.yaml',
  })
  @IsOptional()
  @IsString()
  accelerateConfig?: string;

  @ApiPropertyOptional({ description: 'Absolute path to the temp directory root', example: '/workspace/temp' })
  @IsOptional()
  @IsString()
  temp?: string;
}