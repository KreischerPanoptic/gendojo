import WeightsFile from '#models/weights_file'
import * as fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import * as path from 'node:path'
import { createHash } from 'node:crypto'
import { FILE_HASHES } from '#registries/models_registry'
import {
  type ModelArchitecture,
  ModelIntegrityStatus,
  ModelProvider,
  ModelStatus,
} from '#contracts/enums'
import {
  RoleToCategoryMap,
  MODEL_EXTENSIONS,
  type ModelCategory,
  type ModelRole,
  MODEL_ROLES,
  FileIntegrityResult,
} from '#types/models'
import { inject } from '@adonisjs/core'
import SettingsService from './settings_service.ts'
import { ARCHITECTURE_REGISTRY } from '#registries/architectures_registry'

@inject()
export class ModelsService {
  constructor(private settingsService: SettingsService) {}

  // Helper to fetch the path exactly when you need it
  private async getModelsPath(): Promise<string> {
    const settings = await this.settingsService.getSettings()
    return settings.modelsPath ?? ''
  }

  // ── Core DB Operations ─────────────────────────────────────────────────────

  /** * List files directly from the database, optionally filtered.
   */
  async list(filters?: { arch?: ModelArchitecture; role?: ModelRole; category?: ModelCategory }) {
    const query = WeightsFile.query()

    if (filters?.arch) query.where('architecture', filters.arch)
    if (filters?.role) query.where('role', filters.role)
    if (filters?.category) query.where('category', filters.category)

    return await query.orderBy('createdAt', 'desc')
  }

  /**
   * Retrieves a model from the DB by its primary UUID.
   */
  async getById(id: string): Promise<WeightsFile | null> {
    return await WeightsFile.find(id)
  }

  /**
   * Deletes a file from the disk AND the database.
   */
  async deleteOne(id: string): Promise<void> {
    const model = await this.getById(id)
    if (!model) throw new Error(`Model not found in DB: ${id}`)

    const absolutePath = path.join(await this.getModelsPath(), model.relativePath)

    try {
      await fs.unlink(absolutePath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err // Ignore if already deleted from disk
    }

    await model.delete()
  }

  // ── Sync Engine (Disk <-> DB) ──────────────────────────────────────────────

  /**
   * Scans the disk and synchronizes the state with the database.
   */
  async refresh(): Promise<WeightsFile[]> {
    console.log(`Starting disk sync for models directory...`)

    const diskFiles = await this.scanDir(await this.getModelsPath())

    const dbFiles = await WeightsFile.all()
    const dbFileMap = new Map(dbFiles.map((f) => [f.relativePath, f]))

    for (const diskFile of diskFiles) {
      const existingRecord = dbFileMap.get(diskFile.relativePath)

      if (existingRecord) {
        if (existingRecord.sizeBytes !== diskFile.sizeBytes) {
          existingRecord.sizeBytes = diskFile.sizeBytes
          await existingRecord.save()
        }
        dbFileMap.delete(diskFile.relativePath)
      } else {
        await WeightsFile.create({
          name: diskFile.name,
          filename: diskFile.filename,
          relativePath: diskFile.relativePath,
          architecture: diskFile.arch === 'unknown' ? null : (diskFile.arch as ModelArchitecture),
          role: diskFile.role as ModelRole,
          category: RoleToCategoryMap[diskFile.role as ModelRole],
          provider: ModelProvider.LOCAL,
          status: ModelStatus.READY,
          sizeBytes: diskFile.sizeBytes,
        })
      }
    }

    for (const [relativePath, orphanedRecord] of dbFileMap.entries()) {
      console.log(`Removing orphaned DB record: ${relativePath}`)
      await orphanedRecord.delete()
    }

    console.log(`Sync complete.`)
    return await WeightsFile.all()
  }

  // ── Registry-Backed Operations ─────────────────────────────────────────────

  /**
   * Uses the new ARCHITECTURE_REGISTRY and the DB to verify if an architecture is ready.
   */
  async checkArchReadiness(arch: ModelArchitecture): Promise<{
    ready: boolean
    matchedVariantIndex?: number
    missingRoles: ModelRole[]
    corruptedFiles: WeightsFile[]
  }> {
    const archDef = ARCHITECTURE_REGISTRY[arch]
    if (!archDef || archDef.variants.length === 0) {
      return { ready: false, missingRoles: [], corruptedFiles: [] }
    }

    const allFiles = await WeightsFile.findManyBy('architecture', arch)

    for (let i = 0; i < archDef.variants.length; i++) {
      const variant = archDef.variants[i]

      const missingRoles = variant.required.filter((role) => {
        const expectedDir = archDef.directories[role]
        if (!expectedDir) return true

        const expectedPrefix = expectedDir.toLowerCase().replace(/\\/g, '/') + '/'

        const fileExists = allFiles.some(
          (f) =>
            f.role === role &&
            f.relativePath.toLowerCase().replace(/\\/g, '/').startsWith(expectedPrefix)
        )

        return !fileExists
      })

      if (missingRoles.length === 0) {
        const fileCorrupted = allFiles.some((f) => f.status === ModelStatus.ERROR)

        if (fileCorrupted) {
          const corrupted = allFiles.filter((f) => f.status === ModelStatus.ERROR)
          return {
            ready: false,
            matchedVariantIndex: i,
            missingRoles: [],
            corruptedFiles: corrupted,
          }
        }

        return { ready: true, matchedVariantIndex: i, missingRoles: [], corruptedFiles: [] }
      }
    }

    const primaryMissing = archDef.variants[0].required.filter((role) => {
      const expectedDir = archDef.directories[role]
      const expectedPrefix = expectedDir ? expectedDir.toLowerCase().replace(/\\/g, '/') + '/' : ''
      return !allFiles.some(
        (f) =>
          f.role === role &&
          f.relativePath.toLowerCase().replace(/\\/g, '/').startsWith(expectedPrefix)
      )
    })
    const corruptedFiles = allFiles.filter((f) => f.status === ModelStatus.ERROR)
    return { ready: false, missingRoles: primaryMissing, corruptedFiles }
  }

  // // Registry-backed operations
  // getRegistryOptions(): AllOptionsDto // Replaces GET /models/options/all
  // checkArchReadiness(arch: ModelArchitecture): ArchReadinessResult // Rewritten to use variants

  // ── Integrity ──────────────────────────────────────────────────────────────

  async checkFileIntegrity(id: string): Promise<FileIntegrityResult> {
    const model = await this.getById(id)
    if (!model) throw new Error(`Model not found: ${id}`)

    const absolutePath = path.join(await this.getModelsPath(), model.relativePath)
    console.log(`Computing SHA-256 for ${model.filename}…`)

    const computedSha256 = await this.computeSha256(absolutePath)
    const expectedSha256 = FILE_HASHES[model.filename] ?? null

    let status: ModelIntegrityStatus = ModelIntegrityStatus.UNKNOWN
    if (expectedSha256) {
      status =
        computedSha256 === expectedSha256.toLowerCase()
          ? ModelIntegrityStatus.OK
          : ModelIntegrityStatus.CORRUPTED
    }

    // Save the computed hash to the DB for future reference
    //model.expectedSha256 = expectedSha256 || computedSha256
    if (status === 'corrupted') model.status = ModelStatus.ERROR
    await model.save()

    return {
      id: model.id,
      filename: model.filename,
      status,
      computedSha256,
      expectedSha256,
      sizeGb: Number.parseInt(model.sizeBytes, 10) / (1024 * 1024 * 1024),
      sizeMb: Number.parseInt(model.sizeBytes, 10) / (1024 * 1024),
      sizeBytes: Number.parseInt(model.sizeBytes),
      checkedAt: new Date(),
    }
  }

  // ── Options & Meta ─────────────────────────────────────────────────────────

  /**
   * Returns distinct filter options based on what is currently in the DB,
   * alongside the static architecture registry for UI blueprint rendering.
   */
  async getOptions() {
    // 1. Get unique values currently present on disk (via DB)
    const diskArchitectures = await WeightsFile.query()
      .distinct('architecture')
      .whereNotNull('architecture')
      .orderBy('architecture', 'asc')

    const diskRoles = await WeightsFile.query()
      .distinct('role')
      .whereNotNull('role')
      .orderBy('role', 'asc')

    const diskCategories = await WeightsFile.query()
      .distinct('category')
      .whereNotNull('category')
      .orderBy('category', 'asc')

    return {
      // Options for dropdowns (only shows what the user actually has)
      available: {
        architectures: diskArchitectures.map((r) => r.architecture),
        roles: diskRoles.map((r) => r.role),
        categories: diskCategories.map((r) => r.category),
      },
      // Static source of truth for the UI to draw "Blueprint" cards
      static: {
        registry: ARCHITECTURE_REGISTRY,
      },
    }
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  private async scanDir(
    dir: string,
    relativeBase = ''
  ): Promise<
    {
      name: string
      filename: string
      relativePath: string
      sizeBytes: string
      arch: string
      role: string
    }[]
  > {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }

    const results: {
      name: string
      filename: string
      relativePath: string
      sizeBytes: string
      arch: string
      role: string
    }[] = []

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name)
      const relativePath = relativeBase ? path.join(relativeBase, entry.name) : entry.name

      if (entry.isDirectory()) {
        results.push(...(await this.scanDir(absolutePath, relativePath)))
        continue
      }

      if (!entry.isFile()) continue

      const ext = path.extname(entry.name).toLowerCase()
      if (!MODEL_EXTENSIONS.has(ext)) continue

      const stat = await fs.stat(absolutePath)
      const name = path.basename(entry.name, ext)
      const { arch, role } = this.classify(relativePath)

      results.push({
        name,
        filename: entry.name,
        relativePath,
        sizeBytes: stat.size.toString(), // Store as string to avoid BigInt issues in DB
        arch,
        role,
      })
    }

    return results
  }

  /**
   * Deduces architecture and role by reverse-engineering the ARCHITECTURE_REGISTRY directories.
   */
  private classify(relativePath: string): { arch: string; role: string } {
    const p = relativePath.toLowerCase().replace(/\\/g, '/')

    // Iterate through our SSOT registry to see which directory this file lives in
    for (const [archKey, archDef] of Object.entries(ARCHITECTURE_REGISTRY)) {
      for (const [roleKey, dirPath] of Object.entries(archDef.directories)) {
        if (!dirPath) continue

        const expectedPrefix = dirPath.toLowerCase().replace(/\\/g, '/') + '/'

        if (p.startsWith(expectedPrefix)) {
          // If the directory starts with 'shared/', the file is architecture-agnostic
          const resolvedArch = expectedPrefix.startsWith('shared/') ? 'unknown' : archKey
          return { arch: resolvedArch, role: roleKey }
        }
      }
    }

    return { arch: 'unknown', role: 'unknown' }
  }

  private computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256')
      const stream = fsSync.createReadStream(filePath)
      stream.on('data', (chunk: Buffer | string) => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }
}
