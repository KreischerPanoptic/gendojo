import { IsOptional, ValidateNested, IsIn } from 'class-validator';
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

  @IsOptional()
  @IsIn(['dark', 'light', 'auto'])
  theme?: 'dark' | 'light' | 'auto';
}

// export class UpdateSettingsDto {
//   paths?: PathsDto;
//   training?: TrainingSettingsDto;
//   theme?: 'dark' | 'light' | 'auto';
// }