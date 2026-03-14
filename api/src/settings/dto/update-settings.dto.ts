import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PathsDto } from './paths.dto';
import { TrainingSettingsDto } from './training-settings.dto';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Partial path overrides — only provided paths are updated',
    type: () => PathsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PathsDto)
  paths?: PathsDto;

  @ApiPropertyOptional({
    description: 'Partial training constant overrides — only provided values are updated',
    type: () => TrainingSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrainingSettingsDto)
  training?: TrainingSettingsDto;

  @ApiPropertyOptional({
    enum: ['dark', 'light', 'auto'],
    description: 'UI colour theme',
    example: 'auto',
  })
  @IsOptional()
  @IsIn(['dark', 'light', 'auto'])
  theme?: 'dark' | 'light' | 'auto';
}