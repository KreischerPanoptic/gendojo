import type { TrainTomlDto } from '../../toml/dto/train-toml.dto';
import type { DatasetTomlDto } from '../../toml/dto/dataset-toml.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

export enum JobStatus {
  /** TOML files written, process not yet started */
  Pending  = 'pending',
  /** accelerate launch process is alive */
  Running  = 'running',
  /** Process exited with code 0 */
  Done     = 'done',
  /** Process exited with non-zero code or was killed by an error */
  Failed   = 'failed',
  /** Killed via DELETE /jobs/:id */
  Killed   = 'killed',
}

// ─────────────────────────────────────────────────────────────────────────────
// Log entry
// ─────────────────────────────────────────────────────────────────────────────

export type LogStream = 'stdout' | 'stderr';

export interface LogLine {
  /** Unix ms timestamp */
  ts: number;
  stream: LogStream;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Job record (in-memory)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingJob {
  id: string;
  /** Human-readable label (output_name from train config) */
  name: string;
  arch: string;
  /**
   * Dataset reference — set when job was created via datasetRef shorthand.
   * Undefined when the full dataset DTO was provided manually.
   */
  datasetName?: string;
  /** Absolute path to the job working directory */
  jobDir: string;
  /** Absolute path to dataset.toml */
  datasetTomlPath: string;
  /** Absolute path to train.toml */
  trainTomlPath: string;
  /** Log file path inside jobDir */
  logFilePath: string;
  /** Training script filename e.g. flux_train_network.py */
  script: string;
  /** Full accelerate launch command that was invoked */
  command: string;
  status: JobStatus;
  /** PID of the spawned process (undefined once process exits) */
  pid?: number;
  /** Exit code (set when status becomes done/failed/killed) */
  exitCode?: number;
  /** Ring buffer — last LOG_BUFFER_SIZE lines */
  logBuffer: LogLine[];
  /** ISO timestamp when job was created */
  createdAt: string;
  /** ISO timestamp when job transitioned to running */
  startedAt?: string;
  /** ISO timestamp when job reached a terminal state */
  finishedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public-facing DTOs
// ─────────────────────────────────────────────────────────────────────────────

export type JobSummary = Omit<TrainingJob, 'logBuffer'>;

export interface JobDetail extends JobSummary {
  logBuffer: LogLine[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset resolution options for datasetRef mode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bucketing / resolution settings that are auto-applied when using datasetRef.
 * These become the [[datasets]] section of the generated dataset.toml.
 *
 * All fields are optional — sensible defaults are applied:
 *   resolution     → 1024
 *   enable_bucket  → true
 *   batch_size     → 1
 */
export interface DatasetRefOptions {
  /**
   * Training resolution. Square (1024) or rectangular ([width, height]).
   * Default: 1024
   */
  resolution?: number | [number, number];
  /** Enable Aspect Ratio Bucketing. Default: true */
  enable_bucket?: boolean;
  /** Min bucket resolution. Default: 256 */
  min_bucket_reso?: number;
  /** Max bucket resolution. Default: 2048 */
  max_bucket_reso?: number;
  /** Batch size for this dataset. Default: 1 */
  batch_size?: number;
  /** Number of repeats per epoch. Default: 1 */
  num_repeats?: number;
  /** Shuffle caption tags. Default: false */
  shuffle_caption?: boolean;
  /** Number of tokens kept fixed when shuffle_caption is true. */
  keep_tokens?: number;
  /** Caption file extension. Default: ".txt" */
  caption_extension?: string;
  /** Class tokens fallback when no caption file exists. */
  class_tokens?: string;
  /** Flip augmentation. Only valid when cache_latents is not set. */
  flip_aug?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create job DTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload for POST /jobs — two mutually exclusive dataset modes.
 *
 * ── Mode 1: datasetRef  (simple, UI-friendly) ───────────────────────────────
 * Reference a dataset by name (as managed by DatasetsService).
 * JobsService resolves the path, validates the dataset exists and has images,
 * then auto-builds a DatasetTomlDto.
 *
 *   {
 *     train: { arch: 'flux', ... },
 *     datasetRef: 'my_char',
 *     datasetOptions: { resolution: 1024, enable_bucket: true }
 *   }
 *
 * ── Mode 2: dataset  (full control, power users) ────────────────────────────
 * Provide the complete DatasetTomlDto with explicit paths.
 * Same as before — no change in behavior.
 *
 *   {
 *     train: { arch: 'flux', ... },
 *     dataset: { datasets: [{ resolution: 1024, subsets: [{ image_dir: '...' }] }] }
 *   }
 *
 * Exactly one of `datasetRef` or `dataset` must be provided.
 * JobsService throws 422 if both or neither are present.
 */
export type CreateJobDto =
  | {
      train: TrainTomlDto;
      /** Dataset name as known to DatasetsService (directory name under /workspace/datasets/) */
      datasetRef: string;
      /** Optional bucketing / augmentation settings for the auto-built config */
      datasetOptions?: DatasetRefOptions;
      dataset?: never;
    }
  | {
      train: TrainTomlDto;
      /** Full dataset TOML configuration with explicit paths */
      dataset: DatasetTomlDto;
      datasetRef?: never;
      datasetOptions?: never;
    };

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO event shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface JobLogEvent {
  jobId: string;
  line: LogLine;
}

export interface JobStatusEvent {
  jobId: string;
  status: JobStatus;
  exitCode?: number;
}