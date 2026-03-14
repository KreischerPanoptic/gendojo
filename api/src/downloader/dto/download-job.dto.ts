import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { DownloadSource, DownloadStatus } from "../types/downloader.types";

export class DownloadJobDto {
  @ApiProperty({ description: 'Job UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: ['huggingface', 'civitai', 'direct'], description: 'Download source', example: 'huggingface' })
  source: DownloadSource;

  @ApiProperty({ description: 'Resolved download URL (may contain auth token for CivitAI)', example: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors' })
  url: string;

  @ApiProperty({ description: 'Model architecture', example: 'flux' })
  arch: string;

  @ApiProperty({ description: 'Model role', example: 'dit' })
  role: string;

  @ApiProperty({ description: 'Target filename on disk', example: 'flux1-dev.safetensors' })
  filename: string;

  @ApiProperty({ description: 'Absolute destination path', example: '/workspace/models/flux/dit/flux1-dev.safetensors' })
  destination: string;

  @ApiProperty({
    enum: ['pending', 'downloading', 'completed', 'failed', 'cancelled', 'skipped'],
    description: '"skipped" means the file already existed at destination — no download was performed.',
    example: 'downloading',
  })
  status: DownloadStatus;

  @ApiProperty({ description: 'Bytes downloaded so far', example: 5242880 })
  bytesDownloaded: number;

  @ApiProperty({ description: 'Total file size in bytes (0 until Content-Length is received)', example: 24953856000 })
  bytesTotal: number;

  @ApiProperty({ description: 'Download progress 0–100. -1 when total is unknown.', example: 21 })
  progressPercent: number;

  @ApiProperty({ description: 'True when the file was already on disk and the download was skipped', example: false })
  alreadyExisted: boolean;

  @ApiProperty({ description: 'ISO timestamp of job creation', example: '2025-06-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'ISO timestamp of completion / failure / cancellation', nullable: true })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Error message when status is "failed"', nullable: true, type: String })
  error?: string;
}