// ─────────────────────────────────────────────────────────────────────────────
// Sample prompt — parsed from prompts.txt (one entry per line)
//
// Prompt line format (sd-scripts):
//   token. Prompt text --d 42 --w 1216 --h 832 --s 28 --c 7.0 --n negative
//
// Flags:
//   --d  seed
//   --w  width
//   --h  height
//   --s  steps
//   --c  cfg / guidance scale
//   --n  negative prompt (rest of line after flag)
// ─────────────────────────────────────────────────────────────────────────────

export interface SamplePrompt {
  /** 0-based index — matches the _NN suffix in preview filenames */
  index: number;
  /** Prompt text as written in prompts.txt (activation token included) */
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview image — one PNG inside {output_dir}/sample/
// Filename convention from sd-scripts:
//   {output_name}-{epoch:06d}e_{index:02d}.png   (epoch-triggered)
//   {output_name}-{step:08d}_{index:02d}.png      (step-triggered)
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckpointPreview {
  /** Filename only, e.g. "zoroj-000004e_01.png" */
  filename: string;
  /** 0-based index into JobOutputs.prompts */
  promptIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint — one .safetensors file in output_dir
// Filename convention from sd-scripts:
//   {output_name}-{epoch:06d}e.safetensors   (epoch save)
//   {output_name}-{step:08d}.safetensors      (step save)
//   {output_name}.safetensors                 (final)
// ─────────────────────────────────────────────────────────────────────────────

export interface Checkpoint {
  /** Filename only, e.g. "zoroj-000004e.safetensors" */
  filename: string;
  /** Epoch number (undefined for step or final checkpoints) */
  epoch?: number;
  /** Step number (undefined for epoch or final checkpoints) */
  step?: number;
  sizeBytes: number;
  /** ISO timestamp from filesystem mtime */
  createdAt: string;
  /** Preview images generated at this checkpoint */
  previews: CheckpointPreview[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Full outputs response — GET /jobs/:id/outputs
// ─────────────────────────────────────────────────────────────────────────────

export interface JobOutputs {
  /** Resolved output_dir for this job */
  outputDir: string;
  /** Absolute path to sample/ subdirectory, null if it doesn't exist yet */
  sampleDir: string | null;
  /** Checkpoints found in outputDir, ordered by epoch/step ascending */
  checkpoints: Checkpoint[];
  /**
   * Parsed prompts list — indexed by CheckpointPreview.promptIndex.
   * Empty array when no prompts file was configured for this job.
   */
  prompts: SamplePrompt[];
}