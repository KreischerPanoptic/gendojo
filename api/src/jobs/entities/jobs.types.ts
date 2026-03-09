import type { TrainTomlDto } from '../../toml/dto/train-toml.dto';
import type { DatasetTomlDto } from '../../toml/dto/dataset-toml.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

export enum JobStatus {
  Pending  = 'pending',
  Running  = 'running',
  Done     = 'done',
  Failed   = 'failed',
  Killed   = 'killed',
}

// ─────────────────────────────────────────────────────────────────────────────
// Log entry
// ─────────────────────────────────────────────────────────────────────────────

export type LogStream = 'stdout' | 'stderr';

export interface LogLine {
  ts: number;
  stream: LogStream;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample images — inline prompt definitions for training-time preview
// generation via sd-scripts --sample_prompts
// ─────────────────────────────────────────────────────────────────────────────

export interface SamplePromptInput {
  /** Prompt text WITHOUT the activation token — JobsService prepends it */
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  /**
   * If true this prompt line is written WITHOUT the activation token prefix.
   * Useful for a "clean" variant to compare model behaviour.
   * Default: false
   */
  withoutToken?: boolean;
}

export interface SampleImagesConfig {
  prompts: SamplePromptInput[];
  /**
   * Activation token prepended to prompts where withoutToken is falsy.
   * e.g. "zoroj" → "zoroj. A warrior..." (natural) or "zoroj, A warrior..." (tags)
   */
  activationToken?: string;
  /**
   * How the activation token is joined to the prompt.
   *   'natural' → "{token}. {prompt}"   (natural language captions)
   *   'tags'    → "{token}, {prompt}"   (tag-based captions)
   * Default: 'natural'
   */
  captionStyle?: 'natural' | 'tags';
  /** Generate sample images every N epochs. Mutually exclusive with every_n_steps. */
  every_n_epochs?: number;
  /** Generate sample images every N steps. Mutually exclusive with every_n_epochs. */
  every_n_steps?: number;
  /** Sampler used for sample generation. Default: 'euler_a' */
  sampler?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Job record (in-memory)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingJob {
  id: string;
  name: string;
  arch: string;
  datasetName?: string;
  jobDir: string;
  datasetTomlPath: string;
  trainTomlPath: string;
  logFilePath: string;
  script: string;
  command: string;
  status: JobStatus;
  pid?: number;
  exitCode?: number;
  logBuffer: LogLine[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  /**
   * Resolved output_dir for this job — where sd-scripts writes checkpoints.
   * Defaults to {outputs}/{jobId} (isolated per job to avoid cross-run collisions).
   */
  outputDir: string;
  /**
   * Absolute path to the prompts.txt file written by JobsService when
   * sampleImages was provided in CreateJobDto.
   * Undefined when no sample image config was given.
   */
  samplePromptsPath?: string;
  /**
   * True when this job was loaded from a persisted job.json manifest after a
   * container restart. Archived jobs have no live process and an empty logBuffer
   * (the full log is still available at logFilePath on disk).
   */
  archived?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public-facing DTOs
// ─────────────────────────────────────────────────────────────────────────────

export type JobSummary = Omit<TrainingJob, 'logBuffer'>;

export interface JobDetail extends JobSummary {
  logBuffer: LogLine[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dataset resolution options
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetRefOptions {
  resolution?: number | [number, number];
  enable_bucket?: boolean;
  min_bucket_reso?: number;
  max_bucket_reso?: number;
  batch_size?: number;
  num_repeats?: number;
  shuffle_caption?: boolean;
  keep_tokens?: number;
  caption_extension?: string;
  class_tokens?: string;
  flip_aug?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create job DTO — two mutually exclusive dataset modes
// ─────────────────────────────────────────────────────────────────────────────

export type CreateJobDto =
  | {
      train: TrainTomlDto;
      datasetRef: string;
      datasetOptions?: DatasetRefOptions;
      dataset?: never;
      /** Optional sample image configuration — generates preview images during training */
      sampleImages?: SampleImagesConfig;
    }
  | {
      train: TrainTomlDto;
      dataset: DatasetTomlDto;
      datasetRef?: never;
      datasetOptions?: never;
      sampleImages?: SampleImagesConfig;
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