import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ModelsService } from './models.service';
import type {
  ModelArchitecture,
  ModelType,
  ModelRole,
} from './entities/models.types';
import {
  ALL_ARCHITECTURES,
  ALL_ROLES,
  ALL_TYPES,
  ARCH_ROLES,
} from './entities/models.constants';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  // ── List / query ───────────────────────────────────────────────────────────

  /**
   * GET /models
   * GET /models?arch=flux
   * GET /models?type=text_encoder
   * GET /models?role=clip_l
   * GET /models?arch=flux&role=dit
   */
  @Get()
  list(
    @Query('arch') arch?: ModelArchitecture,
    @Query('type') type?: ModelType,
    @Query('role') role?: ModelRole,
  ) {
    return this.modelsService.list({ arch, type, role });
  }

  /**
   * GET /models/options
   * Returns options derived from files currently on disk.
   *
   * GET /models/options?option=arch   → { architectures: [...] }
   * GET /models/options?option=type   → { types: [...] }
   * GET /models/options?option=role   → { roles: [...] }
   * GET /models/options               → { architectures, types, roles }
   */
  @Get('options')
  options(@Query('option') option?: 'arch' | 'type' | 'role') {
    return this.modelsService.options(option);
  }

  /**
   * GET /models/options/all
   * Returns the full static list of every valid architecture / role / type.
   * Independent of what is currently on disk.
   *
   * ?option=arch  → { architectures }
   * ?option=type  → { types }
   * ?option=role  → { roles }
   * ?arch=flux    → { roles: [...roles valid for flux...] }
   */
  @Get('options/all')
  allOptions(
    @Query('option') option?: 'arch' | 'type' | 'role',
    @Query('arch') arch?: ModelArchitecture,
  ) {
    if (arch && arch !== 'unknown') {
      return { roles: ARCH_ROLES[arch] ?? [] };
    }
    if (option === 'arch') return { architectures: ALL_ARCHITECTURES };
    if (option === 'type') return { types: ALL_TYPES };
    if (option === 'role') return { roles: ALL_ROLES };
    return { architectures: ALL_ARCHITECTURES, types: ALL_TYPES, roles: ALL_ROLES };
  }

  // ── Integrity: architecture readiness ─────────────────────────────────────

  /**
   * GET /models/arch/:arch/readiness
   * Check whether all required files for an architecture are present on disk.
   *
   * Considers shared directories (e.g. Chroma AE/T5 in flux/ subdirs).
   * Returns ready=true only when at least one valid role variant is complete.
   *
   * Example response when FLUX is missing clip_l:
   * {
   *   arch: 'flux', ready: false,
   *   missingRoles: ['clip_l'],
   *   rolePresence: [
   *     { role: 'dit',    present: true,  files: [...], expectedDir: 'flux' },
   *     { role: 'ae',     present: true,  files: [...], expectedDir: 'flux/ae' },
   *     { role: 'clip_l', present: false, files: [],    expectedDir: 'flux/text_encoders' },
   *     { role: 't5xxl',  present: true,  files: [...], expectedDir: 'flux/text_encoders' },
   *   ],
   *   checkedAt: '...'
   * }
   */
  @Get('arch/:arch/readiness')
  archReadiness(@Param('arch') arch: ModelArchitecture) {
    return this.modelsService.checkArchReadiness(arch);
  }

  // ── Integrity: single file ─────────────────────────────────────────────────

  /**
   * GET /models/integrity?id=flux%2Fflux1-dev.safetensors
   *
   * Computes the SHA-256 hash of the file and compares it against the
   * registered hash in model-hashes.registry.ts.
   *
   * status:
   *   'ok'        — hash matches
   *   'corrupted' — hash mismatch — file may be truncated or corrupted
   *   'unknown'   — no hash registered in the registry; hash is still returned
   *
   * ⚠ Warning: for large files (e.g. FLUX DiT ~24 GB) this can take several
   * minutes. The HTTP connection stays open until the check completes.
   */
  @Get('integrity')
  fileIntegrity(@Query('id') id: string) {
    if (!id) {
      throw new NotFoundException('Query param ?id= is required.');
    }
    return this.modelsService.checkFileIntegrity(id);
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  /** POST /models/refresh — re-scan disk and rebuild cache */
  @Post('refresh')
  async refresh() {
    const models = await this.modelsService.refresh();
    return { count: models.length };
  }

  // ── Delete: architecture ───────────────────────────────────────────────────

  /**
   * GET /models/arch/:arch/delete-preview
   * Dry-run: returns what would be deleted for an architecture and any
   * shared-file warnings, without touching disk.
   *
   * Call this before DELETE /models/arch/:arch to let the UI show a
   * confirmation dialog listing shared files.
   */
  @Get('arch/:arch/delete-preview')
  deleteArchPreview(@Param('arch') arch: ModelArchitecture) {
    return this.modelsService.previewDeleteArch(arch);
  }

  /**
   * DELETE /models/arch/:arch
   * Delete all files classified under the given architecture.
   *
   * Files shared with other architectures (e.g. FLUX AE used by Chroma)
   * ARE deleted — the caller is responsible for calling delete-preview
   * first and presenting warnings to the user.
   */
  @Delete('arch/:arch')
  deleteArch(@Param('arch') arch: ModelArchitecture) {
    return this.modelsService.deleteArch(arch);
  }

  // ── Model file: get by id (wildcard — must stay last in GET group) ─────────

  /** GET /models/flux%2Fclip_l.safetensors  (id is URL-encoded relative path) */
  @Get('*path')
  getOne(@Param('0') id: string) {
    const model = this.modelsService.getById(id);
    if (!model) throw new NotFoundException(`Model not found: ${id}`);
    return model;
  }

  // ── Delete: single file (wildcard DELETE — must stay after named routes) ──

  /**
   * DELETE /models/flux%2Fclip_l.safetensors
   *
   * Deletes a single model file by its relative path (URL-encoded).
   * Returns the deleted file and any shared-arch warnings.
   *
   * The UI should call GET /models/:id first to check sharedWithArches
   * (via previewDeleteArch or the model's getArchesForFile result),
   * show a warning if the file is shared, and then call this endpoint.
   */
  @Delete('*path')
  deleteOne(@Param('0') id: string) {
    return this.modelsService.deleteOne(id);
  }
}