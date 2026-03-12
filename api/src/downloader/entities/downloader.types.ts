import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import type { ModelArchitecture, ModelRole } from '../../models/entities/models.types';

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

export type DownloadSource = 'huggingface' | 'civitai' | 'direct';
export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadJob {
  id: string;
  source: DownloadSource;
  /** Resolved URL after preset expansion (may contain token in query for CivitAI) */
  url: string;
  arch: ModelArchitecture;
  role: ModelRole;
  /** Final filename on disk */
  filename: string;
  /** Absolute path where the file will be saved */
  destination: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  /** 0 until Content-Length is received */
  bytesTotal: number;
  /** 0–100; -1 when total is unknown */
  progressPercent: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /downloader
 *
 * Either `presetId` OR (`url` + `arch` + `role` + `filename`) must be provided.
 */
export class StartDownloadDto {
  /** Use a built-in preset — all other fields are inferred from the preset. */
  @IsOptional()
  @IsString()
  presetId?: string;

  /**
   * Direct URL to download from.
   * Supported sources:
   *   - https://huggingface.co/{repo}/resolve/{branch}/{file}
   *   - https://civitai.com/api/download/models/{versionId}
   *   - Any direct HTTPS link
   */
  @ValidateIf((o: StartDownloadDto) => !o.presetId)
  @IsString()
  url?: string;

  @ValidateIf((o: StartDownloadDto) => !o.presetId)
  @IsString()
  arch?: ModelArchitecture;

  @ValidateIf((o: StartDownloadDto) => !o.presetId)
  @IsString()
  role?: ModelRole;

  /** Desired filename on disk. Defaults to the last path segment of the URL. */
  @IsOptional()
  @IsString()
  filename?: string;
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
  /** Approximate size in MB (informational) */
  sizeMb?: number;
  /** Whether a HuggingFace token is needed (gated model) */
  requiresHfToken: boolean;
  description?: string;
  /**
   * Expected SHA-256 hash of the downloaded file (lowercase hex, 64 chars).
   *
   * Fill this in manually from the HuggingFace file page:
   *   repo → Files tab → click file → copy SHA256 icon
   *
   * When present, DownloaderService will automatically run an integrity check
   * after the download completes and set a warning if the hash doesn't match.
   * The hash is also registered into model-hashes.registry.ts at runtime
   * so subsequent GET /models/integrity calls can use it.
   */
  sha256?: string;
}