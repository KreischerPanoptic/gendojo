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

/** * Represents the real-time progress of a training job.
 * Stored only in memory, broadcasted via WebSockets.
 */
export interface JobProgress {
  step: number;
  totalSteps: number;
  percent: number;
  speed: string;     // e.g. "1.42it/s" or "1.50s/it"
  elapsed: string;   // e.g. "00:15"
  eta: string;       // e.g. "5:25:22"
  avrLoss: number;
}