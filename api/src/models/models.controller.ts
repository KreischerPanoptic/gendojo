import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

import { ModelsService } from './models.service';
import type { ModelArchitecture, ModelType, ModelRole } from './types/models.types';
import { ALL_ARCHITECTURES, ALL_ROLES, ALL_TYPES, ARCH_ROLES } from './constants/models.constants';
import { ModelFileDto } from './dto/model-file.dto';
import { SharedFileWarningDto } from './dto/shared-file-warning.dto';
import { ModelsOptionsDto } from './dto/models-options.dto';
import { AllOptionsDto } from './dto/all-options.dto';
import { ArchReadinessResultDto } from './dto/arch-readiness-result.dto';
import { FileIntegrityResultDto } from './dto/file-integrity-result.dto';
import { DeleteArchPreviewDto } from './dto/delete-arch-preview.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { DeleteArchResultDto } from './dto/delete-arch-result.dto';
import { DeleteModelResultDto } from './dto/delete-model-result.dto';

/**
 * REST API for model file management.
 *
 * ── Read ─────────────────────────────────────────────────────────────────────
 * GET  /models                         list / filter model files
 * GET  /models/options                 distinct values present on disk
 * GET  /models/options/all             full static enumerations (no disk scan)
 * GET  /models/arch/:arch/readiness    check if all required files are present
 * GET  /models/integrity?id=...        SHA-256 integrity check for one file
 * GET  /models/arch/:arch/delete-preview  dry-run delete preview
 * GET  /models/*path                   single model file by relative path
 *
 * ── Mutate ───────────────────────────────────────────────────────────────────
 * POST   /models/refresh               re-scan disk and rebuild cache
 * DELETE /models/arch/:arch            delete all files for an architecture
 * DELETE /models/*path                 delete a single file by relative path
 *
 * NOTE: wildcard routes (*path) must remain at the end of their HTTP verb group
 * to avoid shadowing named routes like /options, /refresh, /arch/:arch/…
 */
@ApiTags('Models')
@ApiBearerAuth()
@ApiExtraModels(ModelFileDto, SharedFileWarningDto)
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  // ── List / query ───────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List model files',
    description:
      'Returns cached model files. All three filter params are optional and combinable. ' +
      'Files in shared/ directories (shared AE, T5-XXL, CLIP-L, SD VAE) will have arch="unknown" ' +
      'and must be filtered by role instead.',
  })
  @ApiQuery({ name: 'arch', required: false, description: 'Filter by architecture', example: 'flux' })
  @ApiQuery({ name: 'type', required: false, enum: ['checkpoint', 'lora', 'vae', 'text_encoder', 'unknown'], description: 'Filter by coarse type' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by granular role', example: 'dit' })
  @ApiResponse({ status: 200, description: 'Filtered list of model files', type: [ModelFileDto] })
  list(
    @Query('arch') arch?: ModelArchitecture,
    @Query('type') type?: ModelType,
    @Query('role') role?: ModelRole,
  ): ModelFileDto[] {
    return this.modelsService.list({ arch, type, role });
  }

  @Get('options')
  @ApiOperation({
    summary: 'Get distinct option values from files currently on disk',
    description:
      'Returns architectures, types and/or roles that appear in the model file cache. ' +
      '"unknown" is excluded from all lists. ' +
      'Use ?option= to fetch a single dimension.',
  })
  @ApiQuery({ name: 'option', required: false, enum: ['arch', 'type', 'role'] })
  @ApiResponse({ status: 200, description: 'Distinct values from disk', type: ModelsOptionsDto })
  options(@Query('option') option?: 'arch' | 'type' | 'role'): ModelsOptionsDto {
    return this.modelsService.options(option);
  }

  @Get('options/all')
  @ApiOperation({
    summary: 'Get full static enumerations (independent of disk)',
    description:
      'Returns every valid architecture / role / type regardless of what is currently on disk. ' +
      'Pass ?arch=flux to get only the roles valid for that architecture.',
  })
  @ApiQuery({ name: 'option', required: false, enum: ['arch', 'type', 'role'] })
  @ApiQuery({ name: 'arch', required: false, description: 'When provided, returns only roles valid for this arch', example: 'flux' })
  @ApiResponse({ status: 200, description: 'Static enumeration values', type: AllOptionsDto })
  allOptions(
    @Query('option') option?: 'arch' | 'type' | 'role',
    @Query('arch')   arch?:   ModelArchitecture,
  ): AllOptionsDto {
    if (arch && arch !== 'unknown') {
      return { roles: ARCH_ROLES[arch] ?? [] };
    }
    if (option === 'arch') return { architectures: ALL_ARCHITECTURES };
    if (option === 'type') return { types: ALL_TYPES };
    if (option === 'role') return { roles: ALL_ROLES };
    return { architectures: ALL_ARCHITECTURES, types: ALL_TYPES, roles: ALL_ROLES };
  }

  // ── Integrity: architecture readiness ─────────────────────────────────────

  @Get('arch/:arch/readiness')
  @ApiOperation({
    summary: 'Check whether all required files for an architecture are present',
    description:
      'Uses directory-based presence detection so shared files (in shared/ae/, ' +
      'shared/text_encoders/, shared/vae/) are found correctly even though they carry ' +
      'arch="unknown" in the cache. ' +
      'Returns ready=true only when at least one role variant from ARCH_REQUIRED_ROLES is complete.',
  })
  @ApiParam({ name: 'arch', description: 'Architecture to check', example: 'flux' })
  @ApiResponse({ status: 200, description: 'Readiness result with per-role breakdown', type: ArchReadinessResultDto })
  @ApiResponse({ status: 400, description: 'arch="unknown" is not a valid target' })
  archReadiness(@Param('arch') arch: ModelArchitecture): ArchReadinessResultDto {
    return this.modelsService.checkArchReadiness(arch);
  }

  // ── Integrity: single file ─────────────────────────────────────────────────

  @Get('integrity')
  @ApiOperation({
    summary: 'Compute SHA-256 and compare against the known-hashes registry',
    description:
      'Computes the SHA-256 hash of the file and compares it against model-hashes.registry.ts. ' +
      'status="ok" — matches. status="corrupted" — mismatch (truncated or damaged file). ' +
      'status="unknown" — no hash registered (check is advisory). ' +
      '⚠ Warning: large files (FLUX DiT ~24 GB) can take several minutes. ' +
      'The HTTP connection stays open until the check completes.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Relative path of the file (URL-encoded)',
    example: 'flux/flux1-dev.safetensors',
  })
  @ApiResponse({ status: 200, description: 'Integrity check result', type: FileIntegrityResultDto })
  @ApiResponse({ status: 404, description: 'File not found in cache' })
  fileIntegrity(@Query('id') id: string): Promise<FileIntegrityResultDto> {
    if (!id) throw new NotFoundException('Query param ?id= is required.');
    return this.modelsService.checkFileIntegrity(id);
  }

  // ── Delete: architecture dry-run ──────────────────────────────────────────

  @Get('arch/:arch/delete-preview')
  @ApiOperation({
    summary: 'Dry-run: preview what would be deleted for an architecture',
    description:
      'Returns files that would be deleted and shared-file warnings — without touching disk. ' +
      'Call this before DELETE /models/arch/:arch to show a confirmation dialog ' +
      'listing any files that are shared with other architectures (e.g. AE in shared/ae/).',
  })
  @ApiParam({ name: 'arch', description: 'Architecture to preview', example: 'flux' })
  @ApiResponse({ status: 200, description: 'Delete preview', type: DeleteArchPreviewDto })
  @ApiResponse({ status: 400, description: 'arch="unknown" is not a valid target' })
  deleteArchPreview(@Param('arch') arch: ModelArchitecture): DeleteArchPreviewDto {
    return this.modelsService.previewDeleteArch(arch);
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  @Post('refresh')
  @ApiOperation({
    summary: 'Re-scan models directory and rebuild the cache',
    description:
      'Triggered automatically after every download completes. ' +
      'Call manually if you copied files to the models directory outside of GenDojo.',
  })
  @ApiResponse({ status: 201, description: 'Scan complete', type: RefreshResponseDto })
  async refresh(): Promise<RefreshResponseDto> {
    const models = await this.modelsService.refresh();
    return { count: models.length };
  }

  // ── Delete: architecture ───────────────────────────────────────────────────

  @Delete('arch/:arch')
  @ApiOperation({
    summary: 'Delete all model files classified under an architecture',
    description:
      'Files in shared/ directories (shared AE, T5-XXL, CLIP-L, SD VAE) ARE deleted — ' +
      'the response includes sharedWarnings for the UI to surface. ' +
      'Call GET /models/arch/:arch/delete-preview first to show the user what will be deleted.',
  })
  @ApiParam({ name: 'arch', description: 'Architecture to delete', example: 'flux' })
  @ApiResponse({ status: 200, description: 'Delete result with shared-file warnings', type: DeleteArchResultDto })
  @ApiResponse({ status: 400, description: 'arch="unknown" is not a valid target' })
  deleteArch(@Param('arch') arch: ModelArchitecture): Promise<DeleteArchResultDto> {
    return this.modelsService.deleteArch(arch);
  }

  // ── Single file: get and delete (wildcard — must stay last in their verb group) ──

  @Get('*path')
  @ApiOperation({
    summary: 'Get a single model file by relative path',
    description: 'The path is URL-encoded in the query string. Use the id field from GET /models.',
  })
  @ApiParam({ name: '0', description: 'URL-decoded relative path', example: 'flux/flux1-dev.safetensors' })
  @ApiResponse({ status: 200, description: 'Model file found', type: ModelFileDto })
  @ApiResponse({ status: 404, description: 'Model file not found' })
  getOne(@Param('0') id: string): ModelFileDto {
    const model = this.modelsService.getById(id);
    if (!model) throw new NotFoundException(`Model not found: ${id}`);
    return model;
  }

  @Delete('*path')
  @ApiOperation({
    summary: 'Delete a single model file by relative path',
    description:
      'The response includes sharedWarnings when the deleted file lives in a shared/ directory ' +
      'and other architectures also depend on it.',
  })
  @ApiParam({ name: '0', description: 'URL-decoded relative path', example: 'shared/ae/ae.safetensors' })
  @ApiResponse({ status: 200, description: 'File deleted', type: DeleteModelResultDto })
  @ApiResponse({ status: 404, description: 'Model file not found' })
  deleteOne(@Param('0') id: string): Promise<DeleteModelResultDto> {
    return this.modelsService.deleteOne(id);
  }
}