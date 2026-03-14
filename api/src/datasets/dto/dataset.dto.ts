import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─────────────────────────────────────────────────────────────────────────────
// Caption stats
// ─────────────────────────────────────────────────────────────────────────────

export class CaptionStatsDto {
  @ApiProperty({ description: 'Number of UTF-8 characters in the caption', example: 145 })
  charCount: number;

  @ApiProperty({ description: 'Approximate word count (whitespace-split)', example: 22 })
  wordCount: number;

  @ApiProperty({
    description: 'True when charCount exceeds the CLIP threshold (200 chars). Flag for SD/SDXL training.',
    example: false,
  })
  isLongForClip: boolean;

  @ApiProperty({
    description: 'True when charCount exceeds the T5 threshold (900 chars). Flag for FLUX/SD3/Hunyuan training.',
    example: false,
  })
  isLongForT5: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption length summary
// ─────────────────────────────────────────────────────────────────────────────

export class CaptionLengthSummaryDto {
  @ApiProperty({
    description: 'Number of captioned images where charCount > 200 (CLIP threshold)',
    example: 3,
  })
  longForClipCount: number;

  @ApiProperty({
    description: 'Number of captioned images where charCount > 900 (T5 threshold)',
    example: 0,
  })
  longForT5Count: number;

  @ApiProperty({ description: 'Average character count across all captioned images', example: 112 })
  avgCharCount: number;

  @ApiProperty({ description: 'Average word count across all captioned images', example: 17 })
  avgWordCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset metadata (DB record)
// ─────────────────────────────────────────────────────────────────────────────

export class DatasetMetaDto {
  @ApiPropertyOptional({
    description: 'Human-readable description of the dataset',
    example: 'Portrait photos of Aisha, studio lighting, various angles',
    nullable: true,
    type: String,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Activation / trigger token used during training',
    example: 'aishachar',
    nullable: true,
    type: String,
  })
  activationToken: string | null;

  @ApiProperty({
    enum: ['tag_list', 'natural_language', 'mixed', 'unknown'],
    description: 'Caption style — auto-detected on first upload or manually set',
    example: 'tag_list',
  })
  captionType: string;

  @ApiProperty({
    enum: ['unknown', 'style', 'character', 'object', 'concept', 'clothing'],
    description: 'Conceptual category of the dataset',
    example: 'character',
  })
  type: string;

  @ApiProperty({ description: 'Target training resolution in pixels (informational)', example: 1024 })
  resolution: number;

  @ApiProperty({
    description: 'Number of leading caption tokens to never shuffle during training',
    example: 1,
  })
  keep_tokens_count: number;

  @ApiProperty({
    description: 'Whether any caption files were found on last scan',
    example: true,
  })
  has_captions: boolean;

  @ApiPropertyOptional({
    description: 'Optional free-form notes about this dataset',
    example: 'Shot with Canon R6, post-processed in Lightroom',
    nullable: true,
    type: String,
  })
  notes: string | null;

  @ApiPropertyOptional({
    description: 'Tag → occurrence count map from caption analysis',
    example: { 'portrait': 42, '1girl': 40, 'solo': 38 },
    nullable: true,
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  tagFrequency: Record<string, number> | null;

  @ApiProperty({ description: 'Total byte size of all files in the dataset', example: 524288000 })
  total_file_size: number;

  @ApiProperty({ description: 'ISO timestamp — when this metadata record was first created', example: '2025-06-01T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'ISO timestamp — when this metadata record was last updated', example: '2025-06-15T09:30:00.000Z' })
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset image
// ─────────────────────────────────────────────────────────────────────────────

export class DatasetImageDto {
  @ApiProperty({ description: 'Filename only, e.g. "my_char_001.jpg"', example: 'my_char_001.jpg' })
  filename: string;

  @ApiProperty({ description: 'Absolute path on disk', example: '/workspace/datasets/my_char/my_char_001.jpg' })
  path: string;

  @ApiProperty({ description: 'File size in bytes', example: 1048576 })
  sizeBytes: number;

  @ApiProperty({ description: 'True if a matching .txt caption file exists', example: true })
  hasCaption: boolean;

  @ApiProperty({
    description: 'Caption length statistics — null when hasCaption is false',
    type: () => CaptionStatsDto,
    nullable: true,
  })
  captionStats: CaptionStatsDto | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset summary (GET /datasets list item)
// ─────────────────────────────────────────────────────────────────────────────

export class DatasetSummaryDto {
  @ApiProperty({ description: 'Dataset directory name — used as identifier in all API calls', example: 'my_char' })
  name: string;

  @ApiProperty({ description: 'Absolute path on disk', example: '/workspace/datasets/my_char' })
  path: string;

  @ApiProperty({ description: 'Total number of supported image files', example: 42 })
  imageCount: number;

  @ApiProperty({ description: 'Number of images that have a matching .txt caption file', example: 40 })
  captionedCount: number;

  @ApiProperty({ description: 'Caption coverage fraction 0.0–1.0', example: 0.95 })
  captionCoverage: number;

  @ApiProperty({ description: 'ISO timestamp of last directory modification', example: '2025-06-15T09:30:00.000Z' })
  updatedAt: string;

  @ApiProperty({
    description: 'Persisted metadata from DB — null when no record exists yet (e.g. manually created dataset)',
    type: () => DatasetMetaDto,
    nullable: true,
  })
  meta: DatasetMetaDto | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset detail (GET /datasets/:name)
// ─────────────────────────────────────────────────────────────────────────────

export class DatasetDetailDto extends DatasetSummaryDto {
  @ApiProperty({ description: 'List of all image files with caption status and stats', type: [DatasetImageDto] })
  images: DatasetImageDto[];

  @ApiProperty({
    description: 'Aggregate caption length stats across all captioned images — null if no captions present',
    type: () => CaptionLengthSummaryDto,
    nullable: true,
  })
  captionLengthSummary: CaptionLengthSummaryDto | null;
}