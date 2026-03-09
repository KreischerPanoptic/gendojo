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
  /**
   * True when this job was restored from a persisted job.json manifest after a
   * container restart. Archived jobs have no live process — their log is only
   * available on disk at logFilePath.
   */
  archived?: boolean
}

export interface JobDetail extends JobSummary {
  logBuffer: LogLine[]
  jobDir: string
  datasetTomlPath: string
  trainTomlPath: string
  logFilePath: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample image generation
// ─────────────────────────────────────────────────────────────────────────────

export interface SamplePromptInput {
  /** Prompt text. The activation token is prepended by the backend (unless withoutToken=true) */
  prompt: string
  /** --n  Negative prompt */
  negativePrompt?: string
  /** --d  Seed */
  seed?: number
  /** --w  Width in pixels */
  width?: number
  /** --h  Height in pixels */
  height?: number
  /** --s  Number of sampling steps */
  steps?: number
  /** --c  CFG / guidance scale */
  cfg?: number
  /**
   * When true, the activation token is NOT prepended to this prompt.
   * Useful for a "clean" comparison image that shows model behaviour before the token.
   */
  withoutToken?: boolean
}

export interface SampleImagesConfig {
  prompts: SamplePromptInput[]
  /** Token prepended to all prompts where withoutToken is falsy */
  activationToken?: string
  /**
   * How the token is joined to the prompt text.
   * - natural: "token. Prompt…"
   * - tags:    "token, prompt…"
   */
  captionStyle?: 'natural' | 'tags'
  /** Generate every N epochs (default: 1). Mutually exclusive with every_n_steps. */
  every_n_epochs?: number
  /** Generate every N steps. Mutually exclusive with every_n_epochs. */
  every_n_steps?: number
  /** Sampler passed to gen_img. Default: euler_a */
  sampler?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Create job request — two modes
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
  /** Optional: generate sample images at checkpoints during training */
  sampleImages?: SampleImagesConfig
}

/**
 * Advanced job creation with full dataset TOML control.
 */
export interface CreateJobByDtoRequest {
  train: TrainConfig
  dataset: FullDatasetDto
  /** Optional: generate sample images at checkpoints during training */
  sampleImages?: SampleImagesConfig
}

export type CreateJobRequest = CreateJobByRefRequest | CreateJobByDtoRequest

// ─────────────────────────────────────────────────────────────────────────────
// Train config
// ─────────────────────────────────────────────────────────────────────────────

export type ModelArchitecture =
  | 'sd1' | 'sd2' | 'sdxl' | 'flux' | 'sd3' | 'anima' | 'lumina' | 'hunyuan' | 'chroma'

export interface TrainConfig {
  arch: ModelArchitecture
  output_name: string
  pretrained_model_name_or_path: string
  output_dir?: string

  network_dim?: number
  network_alpha?: number

  max_train_steps?: number
  max_train_epochs?: number
  learning_rate?: number
  unet_lr?: number
  text_encoder_lr?: number
  lr_scheduler?: string
  lr_warmup_steps?: number

  save_every_n_epochs?: number
  save_every_n_steps?: number
  save_last_n_epochs?: number

  mixed_precision?: 'no' | 'fp16' | 'bf16'
  save_precision?: 'float' | 'fp16' | 'bf16'

  // dataset_config injected by JobsService at submission time
  dataset_config?: string

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
// Response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface KillJobResponse {
  killed: boolean
  status: JobStatus
}

export interface JobLogsResponse {
  logs: LogLine[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO event shapes
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