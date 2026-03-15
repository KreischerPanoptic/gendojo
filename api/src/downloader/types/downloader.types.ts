import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import type { ModelArchitecture, ModelRole } from '../../models/types/models.types';

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

export type DownloadSource = 'huggingface' | 'civitai' | 'direct';

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'; // file already exists at destination — no download needed

export interface DownloadJob {
  id: string;
  source: DownloadSource;
  /** Resolved URL after preset expansion */
  url: string;
  arch: ModelArchitecture;
  role: ModelRole;
  /** Final filename on disk */
  filename: string;
  /** Absolute path where the file is/was saved */
  destination: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  /** 0 until Content-Length is received */
  bytesTotal: number;
  /** 0–100; -1 when total is unknown */
  progressPercent: number;
  /**
   * True when the file was already present at destination and the download
   * was skipped. The job will have status 'skipped' and completedAt set.
   */
  alreadyExisted: boolean;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset definition
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelPreset {
  /** Stable unique identifier used in StartDownloadDto.presetId */
  id: string;
  /** Human-readable display name */
  name: string;
  arch: ModelArchitecture;
  role: ModelRole;
  source: DownloadSource;
  /** HuggingFace repository id, e.g. "black-forest-labs/FLUX.1-dev" */
  hfRepoId?: string;
  /** Path inside the HF repo, e.g. "flux1-dev.safetensors" */
  hfFilename?: string;
  /** Direct download URL (used when source is 'direct') */
  directUrl?: string;
  /** Target filename saved to disk. Defaults to hfFilename's basename. */
  filename: string;
  /**
   * When set, overrides the normal arch+role → directory resolution and saves
   * the file to models/<sharedDestination> instead.
   *
   * Use this for files shared across multiple architectures (AE, T5-XXL,
   * CLIP-L, SD VAE ft-MSE) so they are only downloaded once and live in a
   * single canonical location regardless of which arch-specific preset was
   * used to trigger the download.
   *
   * Example: "shared/ae/ae.safetensors"
   *   → saved to <modelsPath>/shared/ae/ae.safetensors
   */
  sharedDestination?: string;
  /** Approximate size in MB (informational) */
  sizeMb?: number;
  /** Whether a HuggingFace token is needed (gated model) */
  requiresHfToken: boolean;
  description?: string;
  /**
   * Expected SHA-256 hash of the downloaded file (lowercase hex, 64 chars).
   * Fill in manually from the HuggingFace file page — never ask Claude for these.
   * When present, DownloaderService runs an integrity check after download.
   */
  sha256?: string;
}