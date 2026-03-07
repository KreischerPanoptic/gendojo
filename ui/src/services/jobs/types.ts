// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'killed'

// ─────────────────────────────────────────────────────────────────────────────
// Log
// ─────────────────────────────────────────────────────────────────────────────

export type LogStream = 'stdout' | 'stderr'

export interface LogLine {
  /** Unix ms timestamp */
  ts: number
  stream: LogStream
  text: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Job records
// ─────────────────────────────────────────────────────────────────────────────

export interface JobSummary {
  id: string
  name: string
  arch: string
  datasetName?: string
  script: string
  command: string
  status: JobStatus
  pid?: number
  exitCode?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

export interface JobDetail extends JobSummary {
  logBuffer: LogLine[]
  jobDir: string
  datasetTomlPath: string
  trainTomlPath: string
  logFilePath: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Create job request — two modes (datasetRef or full dataset DTO)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetRefOptions {
  resolution?: number | [number, number]
  enable_bucket?: boolean
  min_bucket_reso?: number
  max_bucket_reso?: number
  batch_size?: number
  num_repeats?: number
  shuffle_caption?: boolean
  keep_tokens?: number
  caption_extension?: string
  class_tokens?: string
  flip_aug?: boolean
}

/**
 * Simplified job creation using a dataset name managed by DatasetsService.
 * Recommended for UI usage.
 */
export interface CreateJobByRefRequest {
  train: TrainConfig
  datasetRef: string
  datasetOptions?: DatasetRefOptions
}

/**
 * Advanced job creation with full dataset TOML control.
 */
export interface CreateJobByDtoRequest {
  train: TrainConfig
  dataset: FullDatasetDto
}

export type CreateJobRequest = CreateJobByRefRequest | CreateJobByDtoRequest

// ─────────────────────────────────────────────────────────────────────────────
// Train config — core parameters shared across architectures
// See toml/dto/train-toml.dto.ts for the full list
// ─────────────────────────────────────────────────────────────────────────────

export type ModelArchitecture = 'sd1' | 'sd2' | 'sdxl' | 'flux' | 'sd3' | 'anima' | 'lumina' | 'hunyuan' | 'chroma'

export interface TrainConfig {
  arch: ModelArchitecture
  /** Human-readable run name — used as output filename */
  output_name: string
  pretrained_model_name_or_path: string
  /** Optional, defaults to /workspace/outputs */
  output_dir?: string

  // LoRA network
  network_dim?: number
  network_alpha?: number

  // Training loop
  max_train_steps?: number
  max_train_epochs?: number
  learning_rate?: number
  unet_lr?: number
  text_encoder_lr?: number
  lr_scheduler?: string
  lr_warmup_steps?: number

  // Sampling / checkpointing
  save_every_n_epochs?: number
  save_every_n_steps?: number
  save_last_n_epochs?: number

  // Precision
  mixed_precision?: 'no' | 'fp16' | 'bf16'
  save_precision?: 'float' | 'fp16' | 'bf16'

  // Optional extras passed through to the training script
  [key: string]: unknown
}

export interface FullDatasetDto {
  datasets: Array<{
    resolution: number | [number, number]
    enable_bucket?: boolean
    subsets: Array<{
      image_dir: string
      num_repeats?: number
      class_tokens?: string
      caption_extension?: string
    }>
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Kill response
// ─────────────────────────────────────────────────────────────────────────────

export interface KillJobResponse {
  killed: boolean
  status: JobStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs response
// ─────────────────────────────────────────────────────────────────────────────

export interface JobLogsResponse {
  logs: LogLine[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO event shapes (consumed in useJobSocket hook)
// ─────────────────────────────────────────────────────────────────────────────

export interface JobLogEvent {
  jobId: string
  line: LogLine
}

export interface JobStatusEvent {
  jobId: string
  status: JobStatus
  exitCode?: number
}