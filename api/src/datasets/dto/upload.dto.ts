import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, IsBoolean } from 'class-validator';

// ─────────────────────────────────────────────────────────────────────────────
// Response — upload result (zip and file upload share the same shape)
// ─────────────────────────────────────────────────────────────────────────────

export class UploadResultDto {
  @ApiProperty({ description: 'Dataset directory name', example: 'my_char' })
  name: string;

  @ApiProperty({ description: 'Absolute path on disk', example: '/workspace/datasets/my_char' })
  path: string;

  @ApiProperty({ description: 'Total files written (images + captions)', example: 85 })
  extractedFiles: number;

  @ApiProperty({ description: 'Number of supported image files', example: 42 })
  imageCount: number;

  @ApiProperty({ description: 'Number of caption (.txt) files', example: 42 })
  captionCount: number;

  @ApiProperty({
    description: 'Files that were skipped — unsupported extension or nested path inside zip',
    example: ['Thumbs.db', 'subfolder/img.jpg'],
    type: [String],
  })
  skippedFiles: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Response — chunked upload init
// ─────────────────────────────────────────────────────────────────────────────

export class InitChunkedUploadResponseDto {
  @ApiProperty({
    description: 'UUID of the upload session — pass this to /chunk and /complete',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  uploadId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response — chunk saved
// ─────────────────────────────────────────────────────────────────────────────

export class SaveChunkResponseDto {
  @ApiProperty({ description: 'Upload session UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  uploadId: string;

  @ApiProperty({ description: 'Zero-based chunk index that was saved', example: 3 })
  chunkIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request — complete chunked upload
// ─────────────────────────────────────────────────────────────────────────────

export class CompleteChunkedUploadDto {
  @ApiProperty({
    description: 'Upload session UUID returned by POST /upload/chunked/init',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiProperty({
    description: 'Target dataset directory name',
    example: 'my_char',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Total number of chunks that were uploaded — used for assembly verification',
    example: 12,
  })
  @IsInt()
  @IsPositive()
  totalChunks: number;
}