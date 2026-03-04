import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathsConfig } from '../config/paths.config';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type ModelArchitecture =
  | 'sd1'
  | 'sd2'
  | 'sdxl'
  | 'flux'
  | 'chroma'  // FLUX variant — no CLIP-L, guidance_scale=0
  | 'sd3'
  | 'anima'
  | 'lumina'
  | 'hunyuan'
  | 'unknown';

/**
 * Granular role this file plays in a training configuration.
 *
 * Maps to CLI arguments as follows:
 *   checkpoint / dit / unet → --pretrained_model_name_or_path
 *   vae                     → --vae
 *   ae                      → --ae              (FLUX, Lumina)
 *   clip_l                  → --clip_l           (FLUX, SD3)
 *   clip_g                  → --clip_g           (SD3 only; SDXL uses it internally)
 *   t5xxl                   → --t5xxl            (FLUX, SD3)
 *   gemma2                  → --gemma2           (Lumina)
 *   qwen3                   → --qwen3            (Anima)
 *   qwen2_5_vl              → --text_encoder     (HunyuanImage)
 *   byt5                    → --byt5             (HunyuanImage)
 *   llm_adapter             → --llm_adapter_path (Anima, optional)
 */
export type ModelRole =
  | 'checkpoint'    // Merged SD1/SD2 base (U-Net + TE + VAE in one file)
  | 'dit'           // Diffusion Transformer base (FLUX, SD3 MMDiT, Anima MiniTrainDIT, Lumina Next-DiT, HunyuanImage DiT)
  | 'unet'          // Standalone U-Net weights
  | 'lora'          // LoRA / LyCORIS adapter
  | 'vae'           // Variational AutoEncoder (SD1/SD2/SDXL/SD3/Anima/HunyuanImage)
  | 'ae'            // AutoEncoder in FLUX/Lumina terminology (same underlying role as vae)
  | 'clip_l'        // CLIP-L text encoder
  | 'clip_g'        // CLIP-G text encoder
  | 't5xxl'         // T5-XXL text encoder (FLUX, SD3; Anima uses T5 tokenizer only)
  | 'gemma2'        // Gemma2 text encoder (Lumina → --gemma2)
  | 'qwen3'         // Qwen3-0.6B text encoder (Anima → --qwen3)
  | 'qwen2_5_vl'    // Qwen2.5-VL text encoder (HunyuanImage → --text_encoder)
  | 'byt5'          // byT5 text encoder (HunyuanImage → --byt5)
  | 'llm_adapter'   // LLM Adapter Qwen3→T5 bridge (Anima → --llm_adapter_path, optional)
  | 'text_encoder'  // Generic TE fallback
  | 'unknown';

/** Coarse category — kept for backwards-compatible API filtering */
export type ModelType = 'checkpoint' | 'lora' | 'vae' | 'text_encoder' | 'unknown';

export interface ModelFile {
  /** Stable identifier — relative path from models root */
  id: string;
  name: string;
  filename: string;
  relativePath: string;
  absolutePath: string;
  extension: '.safetensors' | '.ckpt' | '.pt' | '.bin';
  sizeBytes: number;
  sizeMb: number;
  /** Best-guess architecture; 'unknown' for files shared across multiple archs */
  arch: ModelArchitecture;
  /**
   * Granular role — determines which CLI training argument this file is passed to.
   * Use this when building a training configuration.
   */
  role: ModelRole;
  /** Coarse category derived from role — use for simple dropdown filtering */
  type: ModelType;
  modifiedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification rules
// ─────────────────────────────────────────────────────────────────────────────

interface ClassifyRule {
  /**
   * Tested against the full relative path, lowercased, with forward slashes.
   * Both the folder structure AND the filename contribute to detection.
   */
  pattern: RegExp;
  arch: ModelArchitecture;
  role: ModelRole;
}

/**
 * Rules are evaluated in a single pass. Both `arch` and `role` accumulate
 * independently — the first rule that resolves each field wins.
 * More-specific patterns must appear before generic ones.
 *
 * See `classify()` for the accumulation logic.
 */
const CLASSIFY_RULES: ClassifyRule[] = [
  // ── LoRA / LyCORIS adapters ───────────────────────────────────────────────
  // Strong signal from folder name or filename prefix; check early.
  { pattern: /\blora\b/,           arch: 'unknown', role: 'lora' },
  { pattern: /\blycori[s]?\b/,     arch: 'unknown', role: 'lora' },

  // ── Text encoders — identified by filename, before generic arch checks ────

  // CLIP-L: shared by FLUX, SD3, SDXL (SDXL bundles it inside the checkpoint,
  // but can also appear as a separate file in custom setups).
  { pattern: /\bclip[_-]?l\b/,    arch: 'unknown',  role: 'clip_l' },

  // CLIP-G: used by SD3 (explicit --clip_g) and embedded in SDXL checkpoints.
  { pattern: /\bclip[_-]?g\b/,    arch: 'unknown',  role: 'clip_g' },

  // T5-XXL: shared by FLUX and SD3; Anima only uses T5 tokenizer, not weights.
  { pattern: /t5[_-]?xxl/,        arch: 'unknown',  role: 't5xxl' },

  // Gemma2 — exclusively Lumina Image 2.0
  { pattern: /gemma[_-]?2/,       arch: 'lumina',   role: 'gemma2' },

  // Qwen3 — exclusively Anima (--qwen3)
  { pattern: /\bqwen3/,    arch: 'anima', role: 'qwen3' }, 

  // Qwen2.5-VL — HunyuanImage (--text_encoder)
  // Matches: qwen_2.5_vl, qwen2.5-vl, qwen-2-5-vl, qwen2_5_vl_7b, etc.
  { pattern: /qwen[_-]?2[._-]?5[._-]?vl/, arch: 'hunyuan', role: 'qwen2_5_vl' },

  // byT5 — HunyuanImage (--byt5)
  { pattern: /\bbyt5\b/,          arch: 'hunyuan',  role: 'byt5' },

  // LLM Adapter — Anima bridge module (--llm_adapter_path, optional)
  { pattern: /llm[_-]?adapter/,   arch: 'anima',    role: 'llm_adapter' },

  // ── VAE / AE — before generic arch checks ─────────────────────────────────

  // ae.safetensors (basename exactly "ae") — used by both FLUX and Lumina.
  // Arch stays 'unknown' since the same file is reused; folder context (below)
  // will resolve arch if placed in flux/ or lumina/ subdirectory.
  { pattern: /(?:^|\/)ae\.[a-z]+$/, arch: 'unknown',  role: 'ae' },

  // Lumina AE with explicit label
  { pattern: /lumina[^/]*ae|ae[^/]*lumina/, arch: 'lumina', role: 'ae' },

  // FLUX AE with explicit label
  { pattern: /flux[^/]*ae|ae[^/]*flux/,     arch: 'flux',   role: 'ae' },

  // Anima Qwen-Image VAE
  { pattern: /qwen[_-]?image[_-]?vae|vae[_-]?qwen/, arch: 'anima', role: 'vae' },

  // Architecture-specific VAEs
  { pattern: /hunyuan[^/]*vae|vae[^/]*hunyuan/, arch: 'hunyuan', role: 'vae' },
  { pattern: /sd3[^/]*vae|vae[^/]*sd3/,         arch: 'sd3',     role: 'vae' },
  { pattern: /sdxl[^/]*vae|vae[^/]*sdxl|xl[_-]?vae/, arch: 'sdxl', role: 'vae' },

  // Generic VAE folder or filename (arch resolved by folder rules below)
  { pattern: /\bvae\b/,           arch: 'unknown',  role: 'vae' },

  // ── Base models (DiT / checkpoint) ────────────────────────────────────────

  // Chroma — FLUX variant (must be before generic FLUX rule)
  { pattern: /\bchroma\b/,        arch: 'chroma',   role: 'dit' },

  // FLUX.1 — matches: flux1-dev, flux1-schnell, flux_dev, flux-dev, etc.
  { pattern: /flux[._-]?1|flux[._-]?(?:dev|schnell)/, arch: 'flux', role: 'dit' },

  // SD3.5 before SD3 (more specific)
  { pattern: /sd[._-]?3[._-]?5|sd3[._-]?5/, arch: 'sd3', role: 'dit' },

  // SD3 / SD3 Medium / SD3 Large
  { pattern: /\bsd[._-]?3\b|sd3_(?:medium|large)/, arch: 'sd3', role: 'dit' },

  // HunyuanImage
  { pattern: /hunyuan[._-]?image|hunyuanimage|hunyuandit/, arch: 'hunyuan', role: 'dit' },

  // Lumina Image 2.0 — matches: lumina-image-2, lumina_2_model, lumina_next
  { pattern: /lumina[._-]?(?:image|next|2)/,  arch: 'lumina',  role: 'dit' },

  // Anima DiT base model
  // Matches: Anima-Preview, anima_dit, anima_base, Anima.safetensors
  { pattern: /\banima\b/,         arch: 'anima',    role: 'dit' },

  // SDXL checkpoint (single merged file)
  { pattern: /sdxl|sd[_-]?xl|xl[_-]?base/, arch: 'sdxl', role: 'checkpoint' },

  // SD2 checkpoint
  { pattern: /v2[._-]?[01]|sd[._-]?2[._-]|stable[_-]?diffusion[._-]?2/, arch: 'sd2', role: 'checkpoint' },

  // SD1 checkpoint (v1-5-pruned, sd_v1-4, etc.)
  { pattern: /v1[._-]?[45]|sd[._-]?1[._-]|stable[_-]?diffusion[._-]?v?1/, arch: 'sd1', role: 'checkpoint' },

  // ── Folder-based architecture hints ───────────────────────────────────────
  // These only set arch — role stays unknown if not already resolved.
  // Placed last because they are weaker signals (just folder names).
  { pattern: /\/flux\//,          arch: 'flux',    role: 'unknown' },
  { pattern: /\/chroma\//,        arch: 'chroma',  role: 'unknown' },
  { pattern: /\/sd3\//,           arch: 'sd3',     role: 'unknown' },
  { pattern: /\/sdxl\//,          arch: 'sdxl',    role: 'unknown' },
  { pattern: /\/anima\//,         arch: 'anima',   role: 'unknown' },
  { pattern: /\/lumina\//,        arch: 'lumina',  role: 'unknown' },
  { pattern: /\/hunyuan\//,       arch: 'hunyuan', role: 'unknown' },
  // Root-level folder name (path doesn't start with /)
  { pattern: /^flux\//,           arch: 'flux',    role: 'unknown' },
  { pattern: /^chroma\//,         arch: 'chroma',  role: 'unknown' },
  { pattern: /^sd3\//,            arch: 'sd3',     role: 'unknown' },
  { pattern: /^sdxl\//,           arch: 'sdxl',    role: 'unknown' },
  { pattern: /^anima\//,          arch: 'anima',   role: 'unknown' },
  { pattern: /^lumina\//,         arch: 'lumina',  role: 'unknown' },
  { pattern: /^hunyuan\//,        arch: 'hunyuan', role: 'unknown' },
];

/** Map granular role → coarse ModelType for backwards-compatible filtering */
const ROLE_TO_TYPE: Readonly<Record<ModelRole, ModelType>> = {
  checkpoint:   'checkpoint',
  dit:          'checkpoint',
  unet:         'checkpoint',
  lora:         'lora',
  vae:          'vae',
  ae:           'vae',
  clip_l:       'text_encoder',
  clip_g:       'text_encoder',
  t5xxl:        'text_encoder',
  gemma2:       'text_encoder',
  qwen3:        'text_encoder',
  qwen2_5_vl:   'text_encoder',
  byt5:         'text_encoder',
  llm_adapter:  'unknown',
  text_encoder: 'text_encoder',
  unknown:      'unknown',
};

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_EXTENSIONS = new Set(['.safetensors', '.ckpt', '.pt', '.bin']);

@Injectable()
export class ModelsService implements OnModuleInit {
  private readonly logger = new Logger(ModelsService.name);
  private cache: ModelFile[] = [];

  constructor(private readonly paths: PathsConfig) {}

  async onModuleInit(): Promise<void> {
    await this.ensureModelsDir();
    await this.refresh();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Return cached list, optionally filtered. */
  list(filters?: {
    arch?: ModelArchitecture;
    type?: ModelType;
    role?: ModelRole;
  }): ModelFile[] {
    let result = this.cache;
    if (filters?.arch) result = result.filter(m => m.arch === filters.arch);
    if (filters?.type) result = result.filter(m => m.type === filters.type);
    if (filters?.role) result = result.filter(m => m.role === filters.role);
    return result;
  }

  /** Re-scan the models directory and rebuild the cache. */
  async refresh(): Promise<ModelFile[]> {
    this.logger.log(`Scanning models directory: ${this.paths.models}`);
    try {
      this.cache = await this.scanDir(this.paths.models);
      this.logger.log(`Found ${this.cache.length} model file(s)`);
    } catch (err) {
      this.logger.error(
        `Failed to scan models directory: ${(err as Error).message}`,
      );
      this.cache = [];
    }
    return this.cache;
  }

  getById(id: string): ModelFile | undefined {
    return this.cache.find(m => m.id === id);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async ensureModelsDir(): Promise<void> {
    try {
      await fs.mkdir(this.paths.models, { recursive: true });
    } catch {
      // Directory already exists — fine
    }
  }

  private async scanDir(
    dir: string,
    relativeBase = '',
  ): Promise<ModelFile[]> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }

    const results: ModelFile[] = [];

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      const relativePath = relativeBase
        ? path.join(relativeBase, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        results.push(...await this.scanDir(absolutePath, relativePath));
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!MODEL_EXTENSIONS.has(ext)) continue;

      const stat = await fs.stat(absolutePath);
      const name = path.basename(entry.name, ext);
      const { arch, role } = this.classify(relativePath);

      results.push({
        id: relativePath,
        name,
        filename: entry.name,
        relativePath,
        absolutePath,
        extension: ext as ModelFile['extension'],
        sizeBytes: stat.size,
        sizeMb: Math.round((stat.size / 1024 / 1024) * 10) / 10,
        arch,
        role,
        type: ROLE_TO_TYPE[role],
        modifiedAt: stat.mtime,
      });
    }

    return results;
  }

  /**
   * Classify a file by its relative path into (arch, role).
   *
   * Rules are evaluated in order. Both fields accumulate independently —
   * the first rule that resolves a field wins for that field.
   * Scanning continues until both fields are resolved or all rules are exhausted.
   *
   * This means a file like `flux/clip_l.safetensors` correctly gets:
   *   role = 'clip_l'  (from the clip_l rule)
   *   arch = 'flux'    (from the /flux/ folder rule)
   * even though the clip_l rule itself leaves arch = 'unknown'.
   */
  private classify(relativePath: string): {
    arch: ModelArchitecture;
    role: ModelRole;
  } {
    // Normalise: lowercase + forward slashes (Windows safety)
    const p = relativePath.toLowerCase().replace(/\\/g, '/');

    let arch: ModelArchitecture = 'unknown';
    let role: ModelRole = 'unknown';

    for (const rule of CLASSIFY_RULES) {
      if (!rule.pattern.test(p)) continue;
      if (arch === 'unknown' && rule.arch !== 'unknown') arch = rule.arch;
      if (role === 'unknown' && rule.role !== 'unknown') role = rule.role;
      if (arch !== 'unknown' && role !== 'unknown') break;
    }

    return { arch, role };
  }
}