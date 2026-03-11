import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PathsDto } from './paths.dto';
import { TrainingSettingsDto } from './training-settings.dto';

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PathsDto)
  paths?: PathsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TrainingSettingsDto)
  training?: TrainingSettingsDto;
}