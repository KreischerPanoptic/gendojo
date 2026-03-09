import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { PathsConfig } from '../config/paths.config';
import {
  MODEL_EXTENSIONS,
  ModelArchitecture,
  ModelFile,
  ModelRole,
  ModelsOptions,
  ModelType,
} from './entities/models.types';
import { CLASSIFY_RULES, ROLE_TO_TYPE } from './entities/models.rules';
import {
  ARCH_REQUIRED_ROLES,
  ARCH_ROLE_DIR,
  ArchRoleDirMap,
} from './entities/models.constants';
import {
  ArchReadinessResult,
  DeleteArchPreview,
  DeleteArchResult,
  DeleteModelResult,
  FileIntegrityResult,
  RolePresence,
  SharedFileWarning,
} from './entities/models.integrity.types';
import { FILE_HASHES } from './entities/models-hashes.registry';

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

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Delete a single model file from disk by its relative path id.
   * Returns the deleted file plus any shared-arch warnings.
   */
  async deleteOne(id: string): Promise<DeleteModelResult> {
    const model = this.getById(id);
    if (!model) throw new NotFoundException(`Model not found: ${id}`);

    const sharedWithArches = this.getArchesForFile(model.relativePath)
      .filter(a => a !== model.arch);

    await fs.unlink(model.absolutePath);
    this.logger.log(`Deleted model file: ${model.relativePath}`);

    await this.refresh();

    const warnings: SharedFileWarning[] = sharedWithArches.length
      ? [{ file: model, sharedWithArches }]
      : [];

    return {
      deleted: [model],
      sharedWarnings: warnings,
      deletedCount: 1,
    };
  }

  /**
   * Preview what would be deleted for an architecture without touching disk.
   * Call this before deleteArch to let the UI show warnings.
   */
  previewDeleteArch(arch: ModelArchitecture): DeleteArchPreview {
    this.assertKnownArch(arch);

    const files = this.list({ arch });
    const sharedWarnings: SharedFileWarning[] = [];

    for (const file of files) {
      const otherArches = this.getArchesForFile(file.relativePath)
        .filter(a => a !== arch);
      if (otherArches.length) {
        sharedWarnings.push({ file, sharedWithArches: otherArches });
      }
    }

    const totalSizeMb = files.reduce((sum, f) => sum + f.sizeMb, 0);

    return { arch, toDelete: files, sharedWarnings, totalSizeMb };
  }

  /**
   * Delete all files classified under the given architecture.
   *
   * Files shared with other architectures are still deleted — the UI is
   * responsible for warning the user via previewDeleteArch first.
   */
  async deleteArch(arch: ModelArchitecture): Promise<DeleteArchResult> {
    this.assertKnownArch(arch);

    const files = this.list({ arch });
    if (!files.length) {
      return { arch, deleted: [], sharedWarnings: [], deletedCount: 0 };
    }

    const sharedWarnings: SharedFileWarning[] = [];
    const deleted: ModelFile[] = [];

    for (const file of files) {
      const otherArches = this.getArchesForFile(file.relativePath)
        .filter(a => a !== arch);

      if (otherArches.length) {
        sharedWarnings.push({ file, sharedWithArches: otherArches });
      }

      try {
        await fs.unlink(file.absolutePath);
        deleted.push(file);
        this.logger.log(`Deleted [${arch}] ${file.relativePath}`);
      } catch (err) {
        this.logger.warn(
          `Failed to delete ${file.relativePath}: ${(err as Error).message}`,
        );
      }
    }

    await this.refresh();

    return {
      arch,
      deleted,
      sharedWarnings,
      deletedCount: deleted.length,
    };
  }

  // ── Integrity: single file ─────────────────────────────────────────────────

  /**
   * Compute the SHA-256 hash of a model file and compare it against the
   * known hash in model-hashes.registry.ts.
   *
   * WARNING: Large model files (e.g. FLUX DiT ~24 GB) will take several
   * minutes to hash. This is a blocking operation — consider calling it
   * from a background job for very large files.
   */
  async checkFileIntegrity(id: string): Promise<FileIntegrityResult> {
    const model = this.getById(id);
    if (!model) throw new NotFoundException(`Model not found: ${id}`);

    this.logger.log(`Computing SHA-256 for ${model.filename} (${model.sizeMb} MB)…`);

    const computedSha256 = await this.computeSha256(model.absolutePath);
    const expectedSha256 = FILE_HASHES[model.filename] ?? null;

    let status: FileIntegrityResult['status'];
    if (!expectedSha256) {
      status = 'unknown';
    } else {
      status = computedSha256 === expectedSha256.toLowerCase() ? 'ok' : 'corrupted';
    }

    if (status === 'corrupted') {
      this.logger.warn(
        `INTEGRITY MISMATCH for ${model.filename}: expected=${expectedSha256} got=${computedSha256}`,
      );
    }

    return {
      id: model.id,
      filename: model.filename,
      status,
      computedSha256,
      expectedSha256,
      sizeMb: model.sizeMb,
      checkedAt: new Date(),
    };
  }

  // ── Integrity: architecture readiness ─────────────────────────────────────

  /**
   * Check whether all required model files for an architecture are present.
   *
   * Uses directory-based presence detection rather than classified arch,
   * so shared files (e.g. FLUX AE used by Chroma) are found correctly
   * even though they carry arch='flux' in the cache.
   */
  checkArchReadiness(arch: ModelArchitecture): ArchReadinessResult {
    this.assertKnownArch(arch);

    const requiredVariants = ARCH_REQUIRED_ROLES[arch];

    // Evaluate each variant — find if any is fully satisfied
    let satisfiedVariant: ModelRole[] | null = null;
    let bestVariantMissing: ModelRole[] = [];
    let bestVariantRoles: ModelRole[] = [];

    for (const variant of requiredVariants) {
      if (variant.length === 0) continue;

      const missing = variant.filter(role => {
        const files = this.filesForArchRole(arch, role);
        return files.length === 0;
      });

      if (missing.length === 0) {
        satisfiedVariant = variant;
        bestVariantRoles = variant;
        bestVariantMissing = [];
        break;
      }

      // Track the variant closest to completion (fewest missing roles)
      if (!bestVariantRoles.length || missing.length < bestVariantMissing.length) {
        bestVariantMissing = missing;
        bestVariantRoles = variant;
      }
    }

    // Build full role presence breakdown for the best/satisfied variant
    const rolePresence: RolePresence[] = bestVariantRoles.map(role => {
      const expectedDir = ARCH_ROLE_DIR[arch]?.[role] ?? arch;
      const files = this.filesForArchRole(arch, role);
      return {
        role,
        required: true,
        present: files.length > 0,
        files,
        expectedDir,
      };
    });

    return {
      arch,
      ready: satisfiedVariant !== null,
      satisfiedVariant,
      missingRoles: bestVariantMissing,
      rolePresence,
      checkedAt: new Date(),
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

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
   * Two-pass accumulation: first rule to resolve each field wins.
   */
  private classify(relativePath: string): {
    arch: ModelArchitecture;
    role: ModelRole;
  } {
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

  /**
   * Return all architectures whose ARCH_ROLE_DIR entries contain directories
   * that are ancestors of the given relative path.
   *
   * Used to detect shared files: if a file is in a directory shared by
   * multiple architectures (e.g. flux/ used by both flux and chroma),
   * this returns all of them.
   */
  private getArchesForFile(relativePath: string): ModelArchitecture[] {
    const p = relativePath.toLowerCase().replace(/\\/g, '/');
    const result = new Set<ModelArchitecture>();

    for (const [arch, dirMap] of Object.entries(ARCH_ROLE_DIR) as [ModelArchitecture, ArchRoleDirMap][]) {
      if (arch === 'unknown') continue;
      for (const dir of Object.values(dirMap)) {
        if (!dir) continue;
        const d = dir.toLowerCase().replace(/\\/g, '/');
        // File is under this directory if its path starts with dir/
        if (p.startsWith(d + '/') || p.startsWith(d + '\\')) {
          result.add(arch);
          break; // one match per arch is enough
        }
      }
    }

    return [...result];
  }

  /**
   * Find cached files that belong to a specific arch+role combination,
   * using directory-based matching rather than classified arch.
   *
   * This is necessary for architectures that share directories:
   * e.g. Chroma's AE/T5 live in flux/ae/ and flux/text_encoders/,
   * so those files carry arch='flux' in the cache even though chroma
   * also depends on them. Checking by expected dir finds them correctly.
   */
  private filesForArchRole(arch: ModelArchitecture, role: ModelRole): ModelFile[] {
    const expectedRelDir = ARCH_ROLE_DIR[arch]?.[role];
    if (!expectedRelDir) return [];

    const expectedAbsDir = path.join(this.paths.models, expectedRelDir)
      .toLowerCase()
      .replace(/\\/g, '/');

    return this.cache.filter(f => {
      const fileAbsDir = path.dirname(f.absolutePath)
        .toLowerCase()
        .replace(/\\/g, '/');
      return fileAbsDir.startsWith(expectedAbsDir) && f.role === role;
    });
  }

  private computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fsSync.createReadStream(filePath);
      stream.on('data', (chunk: Buffer | string) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private assertKnownArch(arch: ModelArchitecture): void {
    if (arch === 'unknown') {
      throw new BadRequestException(
        `Architecture 'unknown' is not a valid target for this operation.`,
      );
    }
  }
}