// ─────────────────────────────────────────────────────────────────────────────
// Sample prompts
// ─────────────────────────────────────────────────────────────────────────────

export interface SamplePrompt {
  index: number
  prompt: string
  negativePrompt?: string
  seed?: number
  width?: number
  height?: number
  steps?: number
  cfg?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoints & previews
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckpointPreview {
  /** PNG filename (basename only, no path) */
  filename: string
  /** Index into JobOutputs.prompts */
  promptIndex: number
}

export interface Checkpoint {
  /** safetensors filename (basename only) */
  filename: string
  /** e.g. 1 for epoch 000001e */
  epoch?: number
  /** e.g. 500 for step 00000500 */
  step?: number
  sizeBytes: number
  createdAt: string
  previews: CheckpointPreview[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Full outputs response
// ─────────────────────────────────────────────────────────────────────────────

export interface JobOutputs {
  outputDir: string
  /** null if sd-scripts didn't create the sample/ subdir yet */
  sampleDir: string | null
  checkpoints: Checkpoint[]
  prompts: SamplePrompt[]
}