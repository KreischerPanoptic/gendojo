import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  IsObject,
  IsBoolean,
} from 'class-validator';

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /datasets/:name/meta — request
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateMetaDto {
  @ApiPropertyOptional({
    description: 'Human-readable description of the dataset',
    example: 'Portrait photos of Aisha, studio lighting, various angles',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Activation / trigger token for this concept',
    example: 'aishachar',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  activationToken?: string | null;

  @ApiPropertyOptional({
    enum: ['tag_list', 'natural_language', 'mixed', 'unknown'],
    description: 'Caption style — set manually or via POST /detect-caption-type',
    example: 'tag_list',
  })
  @IsOptional()
  @IsIn(['tag_list', 'natural_language', 'mixed', 'unknown'])
  captionType?: 'tag_list' | 'natural_language' | 'mixed' | 'unknown';

  @ApiPropertyOptional({
    enum: ['unknown', 'style', 'character', 'object', 'concept', 'clothing'],
    description: 'Conceptual category of the dataset',
    example: 'character',
  })
  @IsOptional()
  @IsIn(['unknown', 'style', 'character', 'object', 'concept', 'clothing'])
  type?: 'unknown' | 'style' | 'character' | 'object' | 'concept' | 'clothing';

  @ApiPropertyOptional({
    description: 'Target training resolution in pixels (informational — does not affect job config)',
    example: 1024,
    minimum: 64,
  })
  @IsOptional()
  @IsInt()
  @Min(64)
  resolution?: number;

  @ApiPropertyOptional({
    description: 'Number of leading caption tokens to never shuffle during training',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  keep_tokens_count?: number;

  @ApiPropertyOptional({
    description: 'Free-form notes about the dataset',
    example: 'Shot with Canon R6, post-processed in Lightroom',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Tag → occurrence count map. Can be populated from caption analysis.',
    example: { 'portrait': 42, '1girl': 40, 'solo': 38 },
    nullable: true,
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  @IsOptional()
  @IsObject()
  tagFrequency?: Record<string, number> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /datasets/:name — response
// ─────────────────────────────────────────────────────────────────────────────

export class DeleteDatasetResponseDto {
  @ApiProperty({ description: 'Always true — throws 404 if dataset was not found', example: true })
  deleted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /datasets/:name/images/:filename — response
// ─────────────────────────────────────────────────────────────────────────────

export class DeleteImageResponseDto {
  @ApiProperty({
    description: 'List of deleted filenames (always contains the image filename)',
    example: ['my_char_001.jpg'],
    type: [String],
  })
  deleted: string[];

  @ApiProperty({
    description: 'True if the companion .txt caption file was also deleted',
    example: true,
  })
  captionDeleted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /datasets/:name/images/:filename — response
// ─────────────────────────────────────────────────────────────────────────────

export class ReplaceImageResponseDto {
  @ApiProperty({
    description: 'Absolute path of the replaced image file',
    example: '/workspace/datasets/my_char/my_char_001.jpg',
  })
  path: string;
}