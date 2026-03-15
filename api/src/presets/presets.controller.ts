import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

import { PresetsService } from './presets.service';
import type { ModelArchitecture } from '../models/types/models.types';
import type { PresetTier } from './types/presets.types';
import {
  CreatePresetDto,
  UpdatePresetDto,
  TrainingPresetDto,
} from './types/presets.types';

/**
 * REST API for training presets.
 *
 * ── Read ─────────────────────────────────────────────────────────────────────
 * GET    /presets                          all presets (system + user, flat array)
 * GET    /presets?arch=flux                filtered by arch
 * GET    /presets?arch=flux&tier=balanced  filtered by arch + tier
 * GET    /presets?source=user              user-only or system-only
 * GET    /presets/grouped                  grouped by arch { flux: [...], sd3: [...] }
 * GET    /presets/grouped?arch=flux        grouped, single arch
 * GET    /presets/:id                      single preset by stable ID
 *
 * ── Write (user presets only) ─────────────────────────────────────────────────
 * POST   /presets        create user preset  → 201
 * PUT    /presets/:id    update user preset  → 200
 * DELETE /presets/:id    delete user preset  → 204
 */
@ApiTags('Presets')
@ApiBearerAuth()
@ApiExtraModels(TrainingPresetDto)
@Controller('presets')
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all training presets',
    description:
      'Returns system presets (from code) and user presets (from DB) merged into a flat array. ' +
      'System presets always appear first. ' +
      'Filter by arch, tier, and/or source.',
  })
  @ApiQuery({ name: 'arch', required: false, description: 'Filter by architecture', example: 'flux' })
  @ApiQuery({ name: 'tier', required: false, enum: ['fast', 'balanced', 'quality', 'custom'], description: 'Filter by tier' })
  @ApiQuery({ name: 'source', required: false, enum: ['system', 'user'], description: 'Filter by preset origin' })
  @ApiResponse({
    status: 200,
    description: 'Flat array of presets matching the filters',
    schema: {
      type: 'object',
      properties: {
        presets: { type: 'array', items: { $ref: getSchemaPath(TrainingPresetDto) } },
      },
    },
  })
  async list(
    @Query('arch')   arch?:   ModelArchitecture,
    @Query('tier')   tier?:   PresetTier,
    @Query('source') source?: 'system' | 'user',
  ): Promise<{ presets: TrainingPresetDto[] }> {
    let presets = await this.presetsService.list({ arch, tier });
    if (source) presets = presets.filter(p => p.source === source);
    return { presets };
  }

  /**
   * GET /presets/grouped
   *
   * Declared BEFORE :id to avoid route collision ("grouped" being matched as a preset ID).
   */
  @Get('grouped')
  @ApiOperation({
    summary: 'List presets grouped by architecture',
    description:
      'Returns an object keyed by architecture name, each containing an array of presets. ' +
      'Useful for building per-arch selector UIs. ' +
      'Pass ?arch= to restrict to a single architecture.',
  })
  @ApiQuery({ name: 'arch', required: false, description: 'Restrict to a single architecture', example: 'flux' })
  @ApiResponse({
    status: 200,
    description: 'Presets grouped by architecture',
    schema: {
      type: 'object',
      properties: {
        grouped: {
          type: 'object',
          description: 'Keys are ModelArchitecture values (flux, sdxl, sd3, …)',
          additionalProperties: {
            type: 'array',
            items: { $ref: getSchemaPath(TrainingPresetDto) },
          },
        },
      },
    },
  })
  async grouped(
    @Query('arch') arch?: ModelArchitecture,
  ): Promise<{ grouped: Record<string, TrainingPresetDto[]> }> {
    return { grouped: await this.presetsService.grouped(arch) };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single preset by ID',
    description:
      'Works for both system preset IDs (e.g. "flux-balanced") and ' +
      'user preset IDs (e.g. "user-550e8400-…").',
  })
  @ApiParam({ name: 'id', description: 'Preset ID', example: 'flux-balanced' })
  @ApiResponse({ status: 200, description: 'Preset found', type: TrainingPresetDto })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  async getOne(@Param('id') id: string): Promise<TrainingPresetDto> {
    const preset = await this.presetsService.getById(id);
    if (!preset) throw new NotFoundException(`Preset not found: ${id}`);
    return preset;
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a user preset',
    description:
      'Saves a new preset to the database. ' +
      'Include only training "knobs" in config — model paths, dataset_config, output_dir, ' +
      'and output_name must not be included (they are job-specific).',
  })
  @ApiBody({ type: CreatePresetDto })
  @ApiResponse({ status: 201, description: 'Preset created', type: TrainingPresetDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreatePresetDto): Promise<TrainingPresetDto> {
    return this.presetsService.create(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a user preset',
    description:
      'Partial update — only provided fields are changed. ' +
      'Config is merged (not replaced) — omitted keys are preserved. ' +
      'Returns 422 when attempting to modify a system preset.',
  })
  @ApiParam({ name: 'id', description: 'User preset ID', example: 'user-550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdatePresetDto })
  @ApiResponse({ status: 200, description: 'Preset updated', type: TrainingPresetDto })
  @ApiResponse({ status: 404, description: 'User preset not found' })
  @ApiResponse({ status: 422, description: 'Cannot modify a system preset' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePresetDto,
  ): Promise<TrainingPresetDto> {
    try {
      return await this.presetsService.update(id, dto);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 422) throw new UnprocessableEntityException(e.message);
      throw err;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user preset',
    description: 'Returns 422 when attempting to delete a system preset.',
  })
  @ApiParam({ name: 'id', description: 'User preset ID', example: 'user-550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 204, description: 'Preset deleted' })
  @ApiResponse({ status: 404, description: 'User preset not found' })
  @ApiResponse({ status: 422, description: 'Cannot delete a system preset' })
  async delete(@Param('id') id: string): Promise<void> {
    try {
      await this.presetsService.delete(id);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 422) throw new UnprocessableEntityException(e.message);
      throw err;
    }
  }
}