import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathsConfig } from '../config/paths.config';
import { MODEL_EXTENSIONS, ModelArchitecture, ModelFile, ModelRole, ModelsOptions, ModelType } from './entities/models.types';
import { CLASSIFY_RULES, ROLE_TO_TYPE } from './entities/models.rules';

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

  options(option?: 'arch' | 'type' | 'role'): ModelsOptions {
    const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

    const architectures = () =>
      unique(this.cache.map(m => m.arch))
        .filter(a => a !== 'unknown')
        .sort() as ModelArchitecture[];

    const types = () =>
      unique(this.cache.map(m => m.type))
        .filter(t => t !== 'unknown')
        .sort() as ModelType[];

    const roles = () =>
      unique(this.cache.map(m => m.role))
        .filter(r => r !== 'unknown')
        .sort() as ModelRole[];

    if (option === 'arch') return { architectures: architectures() };
    if (option === 'type') return { types: types() };
    if (option === 'role') return { roles: roles() };

    return {
      architectures: architectures(),
      types: types(),
      roles: roles(),
    };
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