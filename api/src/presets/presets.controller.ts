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
import { PresetsService } from './presets.service';
import type { ModelArchitecture } from '../models/entities/models.types';
import type {
  CreatePresetDto,
  PresetTier,
  TrainingPreset,
  UpdatePresetDto,
} from './entities/presets.types';

/**
 * REST API for training presets.
 *
 * ── Read ─────────────────────────────────────────────────────────────────────
 * GET    /presets                          all presets (system + user, flat)
 * GET    /presets?arch=flux                filtered by arch
 * GET    /presets?arch=flux&tier=balanced  filtered by arch + tier
 * GET    /presets?source=user              user-only or system-only
 * GET    /presets/grouped                  grouped by arch
 * GET    /presets/grouped?arch=flux        grouped, single arch
 * GET    /presets/:id                      single preset by stable ID
 *
 * ── Write (user presets only) ─────────────────────────────────────────────────
 * POST   /presets           create user preset   → 201 TrainingPreset
 * PUT    /presets/:id       update user preset   → 200 TrainingPreset
 * DELETE /presets/:id       delete user preset   → 204
 */
@Controller('presets')
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  list(
    @Query('arch')   arch?:   ModelArchitecture,
    @Query('tier')   tier?:   PresetTier,
    @Query('source') source?: 'system' | 'user',
  ): { presets: TrainingPreset[] } {
    let presets = this.presetsService.list({ arch, tier });
    if (source) presets = presets.filter(p => p.source === source);
    return { presets };
  }

  /**
   * GET /presets/grouped
   * GET /presets/grouped?arch=flux
   *
   * Must be declared BEFORE :id to avoid route collision.
   */
  @Get('grouped')
  grouped(
    @Query('arch') arch?: ModelArchitecture,
  ): { grouped: ReturnType<PresetsService['grouped']> } {
    return { grouped: this.presetsService.grouped(arch) };
  }

  @Get(':id')
  getOne(@Param('id') id: string): TrainingPreset {
    const preset = this.presetsService.getById(id);
    if (!preset) throw new NotFoundException(`Preset not found: ${id}`);
    return preset;
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  /**
   * POST /presets
   * Body: CreatePresetDto
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePresetDto): TrainingPreset {
    return this.presetsService.create(dto);
  }

  /**
   * PUT /presets/:id
   * Body: UpdatePresetDto  (all fields optional)
   * 422 if the ID belongs to a system preset.
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePresetDto,
  ): TrainingPreset {
    try {
      return this.presetsService.update(id, dto);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 422) throw new UnprocessableEntityException(e.message);
      throw err;
    }
  }

  /**
   * DELETE /presets/:id
   * 422 if the ID belongs to a system preset.
   * 404 if not found.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): void {
    try {
      this.presetsService.delete(id);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 422) throw new UnprocessableEntityException(e.message);
      throw err;
    }
  }
}