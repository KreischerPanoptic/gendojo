import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { TrainingPreset as TrainingPresetEntity } from './entity/preset.entity';
import { ALL_PRESETS } from './data/presets.data';
import type {
  TrainingPreset,
  PresetTier,
  PresetsGrouped,
  CreatePresetDto,
  UpdatePresetDto,
} from './types/presets.types';
import type { ModelArchitecture } from '../models/types/models.types';

@Injectable()
export class PresetsService {
  private readonly logger = new Logger(PresetsService.name);

  constructor(
    @InjectRepository(TrainingPresetEntity)
    private readonly repo: Repository<TrainingPresetEntity>,
  ) {}

  // ── Read ───────────────────────────────────────────────────────────────────

  /**
   * Return all presets (system + user), optionally filtered.
   * System presets are always listed first, then user presets.
   */
  async list(filters?: { arch?: ModelArchitecture; tier?: PresetTier }): Promise<TrainingPreset[]> {
    let system = this.systemPresets();
    let user   = await this.loadUserPresets();

    if (filters?.arch) {
      system = system.filter(p => p.arch === filters.arch);
      user   = user.filter(p => p.arch === filters.arch);
    }
    if (filters?.tier) {
      system = system.filter(p => p.tier === filters.tier);
      user   = user.filter(p => p.tier === filters.tier);
    }

    return [...system, ...user];
  }

  /**
   * Return all presets grouped by architecture.
   * Within each arch: system presets first, then user presets.
   */
  async grouped(arch?: ModelArchitecture): Promise<PresetsGrouped> {
    const presets = await this.list(arch ? { arch } : undefined);
    return presets.reduce<PresetsGrouped>((acc, preset) => {
      if (!acc[preset.arch]) acc[preset.arch] = [];
      acc[preset.arch]!.push(preset);
      return acc;
    }, {});
  }

  /** Look up by stable ID — searches system presets first, then DB */
  async getById(id: string): Promise<TrainingPreset | null> {
    const system = this.systemPresets().find(p => p.id === id);
    if (system) return system;

    const dbId = this.stripUserPrefix(id);
    if (!dbId) return null;

    const record = await this.repo.findOneBy({ id: dbId });
    return record ? this.entityToPreset(record) : null;
  }

  /** Look up by arch + tier — system presets take priority */
  async getByArchTier(arch: ModelArchitecture, tier: PresetTier): Promise<TrainingPreset | null> {
    const system = this.systemPresets().find(p => p.arch === arch && p.tier === tier);
    if (system) return system;

    const record = await this.repo.findOne({ where: { arch, tier } });
    return record ? this.entityToPreset(record) : null;
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  /** Create and persist a new user preset. */
  async create(dto: CreatePresetDto): Promise<TrainingPreset> {
    const record = this.repo.create({
      arch:        dto.arch,
      tier:        dto.tier ?? 'custom',
      label:       dto.label,
      description: dto.description ?? '',
      config:      dto.config as Record<string, unknown>,
    });

    const saved = await this.repo.save(record);
    this.logger.log(`Created user preset "${saved.id}" (${saved.arch} / ${saved.tier})`);
    return this.entityToPreset(saved);
  }

  /** Update label, description and/or config of a user preset. */
  async update(id: string, dto: UpdatePresetDto): Promise<TrainingPreset> {
    // System presets cannot be mutated
    if (this.systemPresets().some(p => p.id === id)) {
      throw Object.assign(
        new Error(`System preset "${id}" is read-only and cannot be modified`),
        { statusCode: 422 },
      );
    }

    const dbId = this.stripUserPrefix(id);
    if (!dbId) throw new NotFoundException(`Preset not found: ${id}`);

    const existing = await this.repo.findOneBy({ id: dbId });
    if (!existing) throw new NotFoundException(`User preset not found: ${id}`);

    if (dto.label       !== undefined) existing.label       = dto.label;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.config      !== undefined) {
      // Merge config — only override provided keys, preserve the rest
      existing.config = { ...existing.config, ...dto.config } as Record<string, unknown>;
    }

    const saved = await this.repo.save(existing);
    this.logger.log(`Updated user preset "${id}"`);
    return this.entityToPreset(saved);
  }

  /** Delete a user preset. Throws 422 for system presets, 404 if not found. */
  async delete(id: string): Promise<void> {
    if (this.systemPresets().some(p => p.id === id)) {
      throw Object.assign(
        new Error(`System preset "${id}" is read-only and cannot be deleted`),
        { statusCode: 422 },
      );
    }

    const dbId = this.stripUserPrefix(id);
    if (!dbId) throw new NotFoundException(`Preset not found: ${id}`);

    const result = await this.repo.delete({ id: dbId });
    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`User preset not found: ${id}`);
    }

    this.logger.log(`Deleted user preset "${id}"`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** System presets from static data — always read from code, never from DB */
  private systemPresets(): TrainingPreset[] {
    return ALL_PRESETS.map(p => ({ ...p, source: 'system' as const }));
  }

  /** Load all user presets from DB and map to the shared TrainingPreset interface */
  private async loadUserPresets(): Promise<TrainingPreset[]> {
    const records = await this.repo.find({ order: { created_at: 'ASC' } });
    return records.map(r => this.entityToPreset(r));
  }

  /**
   * Map a DB entity to the TrainingPreset interface.
   * User preset IDs are exposed with a "user-" prefix so the UI can
   * distinguish them from system preset IDs without a separate field.
   */
  private entityToPreset(entity: TrainingPresetEntity): TrainingPreset {
    return {
      id:          `user-${entity.id}`,
      arch:        entity.arch as ModelArchitecture,
      tier:        entity.tier as PresetTier,
      label:       entity.label,
      description: entity.description ?? '',
      source:      'user',
      createdAt:   entity.created_at.toISOString(),
      updatedAt:   entity.updated_at.toISOString(),
      config:      entity.config,
    };
  }

  /**
   * Strip the "user-" prefix and return the raw UUID for DB lookup.
   * Returns null if the ID does not start with "user-".
   */
  private stripUserPrefix(id: string): string | null {
    return id.startsWith('user-') ? id.slice(5) : null;
  }
}