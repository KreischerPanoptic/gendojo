import { IsOptional, IsString } from 'class-validator';

export class PathsDto {
  @IsOptional()
  @IsString()
  models?: string;

  @IsOptional()
  @IsString()
  datasets?: string;

  @IsOptional()
  @IsString()
  outputs?: string;

  @IsOptional()
  @IsString()
  logs?: string;

  @IsOptional()
  @IsString()
  sdScripts?: string;
}