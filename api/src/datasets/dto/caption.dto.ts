import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsBoolean, IsOptional } from 'class-validator';
import { CaptionStatsDto, DatasetMetaDto } from './dataset.dto';

// ─────────────────────────────────────────────────────────────────────────────
// GET /datasets/:name/captions/:image
// ─────────────────────────────────────────────────────────────────────────────

export class GetCaptionResponseDto {
  @ApiProperty({
    description: 'Caption text — null if no caption file exists for this image',
    example: 'aishachar, 1girl, solo, portrait, looking at viewer, studio background',
    nullable: true,
    type: String,
  })
  caption: string | null;

  @ApiProperty({
    description: 'Caption length stats — null when caption is absent',
    type: () => CaptionStatsDto,
    nullable: true,
  })
  captionStats: CaptionStatsDto | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /datasets/:name/captions/:image — request
// ─────────────────────────────────────────────────────────────────────────────

export class UpsertCaptionDto {
  @ApiProperty({
    description: 'Caption text to write. Overwrites any existing caption for this image.',
    example: 'aishachar, 1girl, solo, portrait, looking at viewer, studio background',
  })
  @IsString()
  @IsNotEmpty()
  caption: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /datasets/:name/captions/:image — response
// ─────────────────────────────────────────────────────────────────────────────

export class UpsertCaptionResponseDto {
  @ApiProperty({
    description: 'Absolute path of the written caption file',
    example: '/workspace/datasets/my_char/my_char_001.txt',
  })
  captionPath: string;

  @ApiProperty({
    description: 'Length stats computed from the newly written caption',
    type: () => CaptionStatsDto,
  })
  captionStats: CaptionStatsDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /datasets/:name/captions/:image — response
// ─────────────────────────────────────────────────────────────────────────────

export class DeleteCaptionResponseDto {
  @ApiProperty({
    description: 'True if the caption file was found and deleted; false if it was already absent (idempotent)',
    example: true,
  })
  deleted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /datasets/:name/captions/prepend-token — request
// ─────────────────────────────────────────────────────────────────────────────

export class PrependTokenDto {
  @ApiProperty({
    description: 'Activation token to prepend to all caption files',
    example: 'aishachar',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    enum: ['tag_list', 'nl_prefix', 'nl_style', 'nl_character'],
    description: [
      'How to insert the token:',
      '  tag_list     → "token, <rest of tags>"',
      '  nl_prefix    → "token. <rest of prompt>"',
      '  nl_style     → "In style of token, <rest of prompt>"',
      '  nl_character → "token character, <rest of prompt>"',
    ].join('\n'),
    example: 'tag_list',
    default: 'tag_list',
  })
  @IsIn(['tag_list', 'nl_prefix', 'nl_style', 'nl_character'])
  @IsOptional()
  mode?: 'tag_list' | 'nl_prefix' | 'nl_style' | 'nl_character';

  @ApiProperty({
    description: 'Skip captions that already start with the token. Defaults to true to avoid duplicate tokens.',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  skipExisting?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /datasets/:name/captions/prepend-token — response
// ─────────────────────────────────────────────────────────────────────────────

export class PrependTokenResultDto {
  @ApiProperty({ description: 'Number of caption files that were updated', example: 38 })
  updated: number;

  @ApiProperty({
    description: 'Number of captions skipped because they already started with the token',
    example: 4,
  })
  skipped: number;

  @ApiProperty({
    description: 'Number of images that had no caption file at all (not touched)',
    example: 0,
  })
  missing: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /datasets/:name/detect-caption-type — response
// ─────────────────────────────────────────────────────────────────────────────

export class DetectCaptionTypeResultDto {
  @ApiProperty({
    enum: ['tag_list', 'natural_language', 'mixed', 'unknown'],
    description: 'Detected caption style',
    example: 'tag_list',
  })
  captionType: string;

  @ApiProperty({ description: 'Number of caption files sampled for detection', example: 30 })
  sampleSize: number;

  @ApiProperty({
    description: 'Fraction of sampled captions classified as tag-list style (0.0–1.0)',
    example: 0.9,
  })
  tagListRatio: number;

  @ApiProperty({
    description: 'Updated metadata after persisting the detected caption type',
    type: () => DatasetMetaDto,
  })
  meta: DatasetMetaDto;
}