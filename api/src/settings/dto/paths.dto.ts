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

  @IsOptional()
  @IsString()
  accelerateConfig?: string;

  @IsOptional()
  @IsString()
  temp?: string;
}

// export type PathsDto = {
//   models?: string;
//   datasets?: string;
//   outputs?: string;
//   logs?: string;
//   sdScripts?: string;
//   accelerateConfig?: string;
//   temp?: string;
// }