import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PresetDto } from './preset.dto';

export class PresetsGroupedDto {
  @ApiProperty({ type: [PresetDto], required: false })
  flux?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  chroma?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  sdxl?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  sd1?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  sd2?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  sd3?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  lumina?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  hunyuan?: PresetDto[];

  @ApiProperty({ type: [PresetDto], required: false })
  anima?: PresetDto[];
}