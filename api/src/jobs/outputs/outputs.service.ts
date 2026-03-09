import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { JobsService } from '../jobs.service';
import type { JobOutputs, Checkpoint, CheckpointPreview, SamplePrompt } from './entities/outputs.types';

// ─────────────────────────────────────────────────────────────────────────────
// Filename patterns — sd-scripts generates different formats per architecture
//
// ── Checkpoints (output_dir/*.safetensors) ────────────────────────────────────
//   {name}-{epoch:06d}e.safetensors   ← epoch save (sd1/sd2/sdxl/flux/sd3)
//   {name}-{epoch:06d}.safetensors    ← epoch save WITHOUT 'e' (Anima/Lumina/HunyuanImage)
//   {name}-{step:08d}.safetensors     ← step save
//   {name}.safetensors                ← final
//
// ── Sample images (output_dir/sample/*.png) ───────────────────────────────────
//
//   Format A — epoch with timestamp (Anima, Lumina, newer sd-scripts):
//     {name}_e{epoch:06d}_{index:02d}_{YYYYMMDDHHmmss}.png
//     e.g. zoroj_e000003_04_20260308225827.png
//
//   Format B — step with timestamp:
//     {name}_{step:08d}_{index:02d}_{YYYYMMDDHHmmss}.png
//     e.g. zoroj_00000500_04_20260308225827.png
//
//   Format C — epoch without timestamp (classic sd1/sdxl):
//     {name}-{epoch:06d}e_{index:02d}.png
//
//   Format D — step without timestamp:
//     {name}-{step:08d}_{index:02d}.png
//
// ── Matching strategy ─────────────────────────────────────────────────────────
//   For A/B: reconstruct checkpoint stem as "{name}-{number}[e]"
//   Register epoch previews under BOTH "{name}-{epoch}e" and "{name}-{epoch}"
//   so they match regardless of whether the checkpoint has the 'e' suffix.
//
//   After matching, reclassify checkpoints as epoch if their previews are
//   epoch-format (contains _e{6digits}_) — fixes Anima/Lumina which omit 'e'.
// ─────────────────────────────────────────────────────────────────────────────

// Checkpoint filename patterns
const RE_CHECKPOINT_EPOCH = /^(.+)-(\d+)e\.safetensors$/;   // name-000003e.safetensors
const RE_CHECKPOINT_STEP  = /^(.+)-(\d+)\.safetensors$/;    // name-000003.safetensors or name-00000500.safetensors

// Preview filename patterns (four formats, see above)
// Format A: name_eEPOCH6_INDEX2_TS14[_SEED].png  (Anima, Lumina, newer scripts)
// Seed suffix (_42, _1337, etc.) is optional — sd-scripts appends it when seed is set
const RE_PREV_EPOCH_TS    = /^(.+)_e(\d{6})_(\d{2})_\d{14}(?:_\d+)?\.png$/;
// Format B: name_STEP8_INDEX2_TS14[_SEED].png
const RE_PREV_STEP_TS     = /^(.+)_(\d{8})_(\d{2})_\d{14}(?:_\d+)?\.png$/;
// Format C: name-EPOCH6e_INDEX2.png  (classic sd1/sdxl)
const RE_PREV_EPOCH_NO_TS = /^(.+)-(\d+)e_(\d{2})\.png$/;
// Format D: name-STEP_INDEX2.png
const RE_PREV_STEP_NO_TS  = /^(.+)-(\d+)_(\d{2})\.png$/;

// Detects whether a preview filename is epoch-format (used for reclassification)
const RE_PREVIEW_IS_EPOCH = /^.+_e\d{6}_\d{2}_\d{14}\.png$|^.+-\d+e_\d{2}\.png$/;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt line parser
//
// Format: [token. ]Prompt text [--d seed] [--w W] [--h H] [--s steps] [--c cfg] [--n neg]
//
// Rules:
//   - Everything before the first -- flag is the positive prompt
//   - --n is special: everything after it (until end of line) is the negative prompt
//   - Other flags are parsed as numbers
// ─────────────────────────────────────────────────────────────────────────────

function parsePromptLine(line: string, index: number): SamplePrompt {
  // Split off --n first since it consumes the rest of the line
  const negMatch = line.match(/--n\s+(.+)$/);
  const negativePrompt = negMatch ? negMatch[1].trim() : undefined;

  // Remove --n and everything after it
  const withoutNeg = negMatch ? line.slice(0, line.indexOf('--n')).trim() : line.trim();

  // Parse numeric flags
  const seed   = extractFlag(withoutNeg, 'd');
  const width  = extractFlag(withoutNeg, 'w');
  const height = extractFlag(withoutNeg, 'h');
  const steps  = extractFlag(withoutNeg, 's');
  const cfg    = extractFloatFlag(withoutNeg, 'c');

  // Strip all remaining flags to get the prompt text
  const prompt = withoutNeg.replace(/--[a-z]\s+\S+/g, '').trim();

  return {
    index,
    prompt,
    ...(negativePrompt !== undefined && { negativePrompt }),
    ...(seed  !== undefined && { seed }),
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(steps !== undefined && { steps }),
    ...(cfg   !== undefined && { cfg }),
  };
}

function extractFlag(line: string, flag: string): number | undefined {
  const m = line.match(new RegExp(`--${flag}\\s+(\\d+)`));
  return m ? parseInt(m[1], 10) : undefined;
}

function extractFloatFlag(line: string, flag: string): number | undefined {
  const m = line.match(new RegExp(`--${flag}\\s+([\\d.]+)`));
  return m ? parseFloat(m[1]) : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OutputsService {
  private readonly logger = new Logger(OutputsService.name);

  constructor(private readonly jobsService: JobsService) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Scan the job's output_dir and return all checkpoints with their
   * associated preview images and parsed prompts.
   *
   * Never throws on missing files — missing outputDir returns empty lists.
   */
  async getOutputs(jobId: string): Promise<JobOutputs> {
    const job = this.jobsService.getRaw(jobId);
    if (!job) throw new NotFoundException(`Job not found: ${jobId}`);

    const { outputDir, samplePromptsPath } = job;
    const sampleDir = path.join(outputDir, 'sample');

    // Parse prompts file first — needed to build preview objects
    const prompts = samplePromptsPath
      ? await this.parsePromptsFile(samplePromptsPath)
      : [];

    // Scan outputDir for checkpoints
    const checkpoints = await this.scanCheckpoints(outputDir, sampleDir);

    // Check if sample dir actually exists
    const sampleDirExists = await fs.stat(sampleDir)
      .then(s => s.isDirectory())
      .catch(() => false);

    return {
      outputDir,
      sampleDir: sampleDirExists ? sampleDir : null,
      checkpoints,
      prompts,
    };
  }

  /**
   * Resolve the absolute path to a preview PNG file for serving.
   * Throws NotFoundException if the job or file doesn't exist.
   */
  async resolvePreviewPath(jobId: string, filename: string): Promise<string> {
    const job = this.jobsService.getRaw(jobId);
    if (!job) throw new NotFoundException(`Job not found: ${jobId}`);

    // Sanitise — no path traversal
    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.png')) {
      throw new NotFoundException(`Not a PNG file: ${safeFilename}`);
    }

    const fullPath = path.join(job.outputDir, 'sample', safeFilename);
    await this.assertFileExists(fullPath, `Preview not found: ${safeFilename}`);
    return fullPath;
  }

  /**
   * Resolve the absolute path to a checkpoint .safetensors file for download.
   * Throws NotFoundException if the job or file doesn't exist.
   */
  async resolveCheckpointPath(jobId: string, filename: string): Promise<string> {
    const job = this.jobsService.getRaw(jobId);
    if (!job) throw new NotFoundException(`Job not found: ${jobId}`);

    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.safetensors')) {
      throw new NotFoundException(`Not a safetensors file: ${safeFilename}`);
    }

    const fullPath = path.join(job.outputDir, safeFilename);
    await this.assertFileExists(fullPath, `Checkpoint not found: ${safeFilename}`);
    return fullPath;
  }

  // ── Private: scanning ─────────────────────────────────────────────────────

  private async scanCheckpoints(
    outputDir: string,
    sampleDir: string,
  ): Promise<Checkpoint[]> {
    let files: string[];
    try {
      files = await fs.readdir(outputDir);
    } catch {
      // outputDir doesn't exist yet (job just started or no checkpoints yet)
      return [];
    }

    // Collect preview filenames once — map stem → [preview entries]
    const previewsByStem = await this.buildPreviewMap(sampleDir);

    const checkpoints: Checkpoint[] = [];

    for (const file of files) {
      if (!file.endsWith('.safetensors')) continue;

      const filePath = path.join(outputDir, file);
      let sizeBytes = 0;
      let createdAt = new Date().toISOString();
      try {
        const stat = await fs.stat(filePath);
        sizeBytes = stat.size;
        createdAt = stat.mtime.toISOString();
      } catch {
        continue; // inaccessible — skip
      }

      // Parse epoch/step from filename
      const stem = file.replace(/\.safetensors$/, '');
      let epoch: number | undefined;
      let step: number | undefined;

      const epochMatch = file.match(RE_CHECKPOINT_EPOCH);
      const stepMatch  = !epochMatch && file.match(RE_CHECKPOINT_STEP);

      if (epochMatch) {
        epoch = parseInt(epochMatch[2], 10);
      } else if (stepMatch) {
        step = parseInt(stepMatch[2], 10);
      }
      // else: final checkpoint — no epoch/step

      const previews = previewsByStem.get(stem) ?? [];

      // Epoch reclassification: some architectures (Anima, Lumina, HunyuanImage)
      // omit the 'e' suffix from checkpoint filenames, so RE_CHECKPOINT_STEP matches
      // epoch checkpoints and labels them as "Step N".
      // If any preview for this checkpoint is epoch-format, reclassify as epoch.
      if (step !== undefined && epoch === undefined) {
        const hasEpochPreviews = previews.some(p => RE_PREVIEW_IS_EPOCH.test(p.filename));
        if (hasEpochPreviews) {
          epoch = step;
          step  = undefined;
        }
      }

      checkpoints.push({
        filename: file,
        ...(epoch !== undefined && { epoch }),
        ...(step  !== undefined && { step  }),
        sizeBytes,
        createdAt,
        previews,
      });
    }

    // Sort: epoch asc, then step asc, final last
    return checkpoints.sort((a, b) => {
      const aKey = a.epoch ?? a.step ?? Infinity;
      const bKey = b.epoch ?? b.step ?? Infinity;
      return aKey - bKey;
    });
  }

  /**
   * Scan the sample/ directory and build a Map<checkpointStem, CheckpointPreview[]>.
   *
   * Key = checkpoint stem (filename without .safetensors extension).
   * Value = sorted list of preview entries for that checkpoint.
   *
   * Handles four preview filename formats emitted by different sd-scripts architectures:
   *
   *   Format A (Anima, Lumina, newer scripts — WITH timestamp):
   *     {name}_e{epoch:06d}_{index:02d}_{YYYYMMDDHHmmss}.png  ← epoch
   *     {name}_{step:08d}_{index:02d}_{YYYYMMDDHHmmss}.png    ← step
   *
   *   Format B (classic sd1/sdxl — WITHOUT timestamp):
   *     {name}-{epoch:06d}e_{index:02d}.png                    ← epoch
   *     {name}-{step:08d}_{index:02d}.png                      ← step
   *
   * For epoch-format previews (Format A), the entry is registered under BOTH
   * "{name}-{epoch}e" and "{name}-{epoch}" so that it matches regardless of
   * whether the checkpoint filename uses the 'e' suffix.
   */
  private async buildPreviewMap(
    sampleDir: string,
  ): Promise<Map<string, CheckpointPreview[]>> {
    const map = new Map<string, CheckpointPreview[]>();

    let files: string[];
    try {
      files = await fs.readdir(sampleDir);
    } catch {
      return map; // sample dir doesn't exist yet
    }

    /** Register a preview under one or more checkpoint stem keys */
    const add = (stems: string[], entry: CheckpointPreview) => {
      for (const stem of stems) {
        const list = map.get(stem);
        if (list) list.push(entry);
        else map.set(stem, [entry]);
      }
    };

    for (const file of files) {
      if (!file.endsWith('.png')) continue;

      const entry = (promptIndex: number): CheckpointPreview => ({ filename: file, promptIndex });

      // ── Format A: {name}_e{epoch:06d}_{index:02d}_{ts14}.png ───────────────
      // e.g. zoroj_e000003_04_20260308225827.png
      const mEpochTs = file.match(RE_PREV_EPOCH_TS);
      if (mEpochTs) {
        const [, name, epochStr, idxStr] = mEpochTs;
        // Register under BOTH stems — checkpoint may or may not have 'e' suffix
        add([`${name}-${epochStr}e`, `${name}-${epochStr}`], entry(parseInt(idxStr, 10)));
        continue;
      }

      // ── Format B: {name}_{step:08d}_{index:02d}_{ts14}.png ─────────────────
      // e.g. zoroj_00000500_04_20260308225827.png
      const mStepTs = file.match(RE_PREV_STEP_TS);
      if (mStepTs) {
        const [, name, stepStr, idxStr] = mStepTs;
        add([`${name}-${stepStr}`], entry(parseInt(idxStr, 10)));
        continue;
      }

      // ── Format C: {name}-{epoch:06d}e_{index:02d}.png ──────────────────────
      // e.g. zoroj-000003e_04.png  (classic sd1/sdxl, no timestamp)
      const mEpochNoTs = file.match(RE_PREV_EPOCH_NO_TS);
      if (mEpochNoTs) {
        const [, name, epochStr, idxStr] = mEpochNoTs;
        add([`${name}-${epochStr}e`, `${name}-${epochStr}`], entry(parseInt(idxStr, 10)));
        continue;
      }

      // ── Format D: {name}-{step}_{index:02d}.png ─────────────────────────────
      // e.g. zoroj-00000500_04.png  (classic sd1/sdxl step save, no timestamp)
      const mStepNoTs = file.match(RE_PREV_STEP_NO_TS);
      if (mStepNoTs) {
        const [, name, stepStr, idxStr] = mStepNoTs;
        add([`${name}-${stepStr}`], entry(parseInt(idxStr, 10)));
        continue;
      }

      this.logger.verbose(`Unrecognised preview filename — skipping: ${file}`);
    }

    // Sort previews within each checkpoint by promptIndex ascending
    for (const list of map.values()) {
      list.sort((a, b) => a.promptIndex - b.promptIndex);
    }

    return map;
  }

  // ── Private: prompts parsing ──────────────────────────────────────────────

  private async parsePromptsFile(filePath: string): Promise<SamplePrompt[]> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      this.logger.warn(`prompts.txt not found at ${filePath} — returning empty list`);
      return [];
    }

    return content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map((line, i) => parsePromptLine(line, i));
  }

  // ── Private: helpers ──────────────────────────────────────────────────────

  private async assertFileExists(fullPath: string, message: string): Promise<void> {
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException(message);
    }
  }
}