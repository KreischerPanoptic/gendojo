import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { ALL_PRESETS } from './data/presets.data';
import type {
  TrainingPreset,
  PresetTier,
  PresetsGrouped,
  CreatePresetDto,
  UpdatePresetDto,
} from './entities/presets.types';
import type { ModelArchitecture } from '../models/entities/models.types';

// ─────────────────────────────────────────────────────────────────────────────
// File location
//
// Follows the same convention as settings.json — next to it in /workspace/gendojo/.
// Override via USER_PRESETS_FILE env var for testing.
// ─────────────────────────────────────────────────────────────────────────────

const USER_PRESETS_FILE =
  process.env['USER_PRESETS_FILE'] ||
  path.resolve(
    process.env['WORKSPACE_ROOT'] ?? '/workspace/gendojo',
    'user-presets.json',
  );

// ─────────────────────────────────────────────────────────────────────────────
// PresetsService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PresetsService implements OnModuleInit {
  private readonly logger = new Logger(PresetsService.name);

  /** In-memory user preset store. Source of truth is the JSON file on disk. */
  private userPresets: TrainingPreset[] = [];

  onModuleInit(): void {
    this.userPresets = this.loadUserPresets();
    this.logger.log(
      `Loaded ${this.userPresets.length} user preset(s) from ${USER_PRESETS_FILE}`,
    );
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  /**
   * Return all presets (system + user), optionally filtered.
   * System presets are always listed first, then user presets.
   */
  list(filters?: { arch?: ModelArchitecture; tier?: PresetTier }): TrainingPreset[] {
    const all = [...this.systemPresets(), ...this.userPresets];
    let result = all;
    if (filters?.arch) result = result.filter(p => p.arch === filters.arch);
    if (filters?.tier) result = result.filter(p => p.tier === filters.tier);
    return result;
  }

  /**
   * Return all presets grouped by architecture.
   * Within each arch: system first, then user.
   */
  grouped(arch?: ModelArchitecture): PresetsGrouped {
    const source = this.list(arch ? { arch } : undefined);
    return source.reduce<PresetsGrouped>((acc, preset) => {
      if (!acc[preset.arch]) acc[preset.arch] = [];
      acc[preset.arch]!.push(preset);
      return acc;
    }, {});
  }

  /** Lookup by stable ID — searches system presets first, then user */
  getById(id: string): TrainingPreset | undefined {
    return (
      this.systemPresets().find(p => p.id === id) ??
      this.userPresets.find(p => p.id === id)
    );
  }

  /** Lookup by arch + tier — system presets take priority */
  getByArchTier(arch: ModelArchitecture, tier: PresetTier): TrainingPreset | undefined {
    return (
      this.systemPresets().find(p => p.arch === arch && p.tier === tier) ??
      this.userPresets.find(p => p.arch === arch && p.tier === tier)
    );
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  /** Create and persist a new user preset. Returns the created preset. */
  create(dto: CreatePresetDto): TrainingPreset {
    const now = new Date().toISOString();
    const preset: TrainingPreset = {
      id:          `user-${randomUUID()}`,
      arch:        dto.arch,
      tier:        dto.tier ?? 'custom',
      label:       dto.label,
      description: dto.description ?? '',
      source:      'user',
      createdAt:   now,
      updatedAt:   now,
      config:      dto.config,
    };

    this.userPresets.push(preset);
    this.persist();
    this.logger.log(`Created user preset "${preset.id}" (${preset.arch} / ${preset.tier})`);
    return preset;
  }

  /** Update label, description and/or config of an existing user preset. */
  update(id: string, dto: UpdatePresetDto): TrainingPreset {
    const index = this.userPresets.findIndex(p => p.id === id);
    if (index === -1) {
      // Guard: system presets cannot be mutated
      if (this.systemPresets().some(p => p.id === id)) {
        throw Object.assign(
          new Error(`System preset "${id}" cannot be modified`),
          { statusCode: 422 },
        );
      }
      throw new NotFoundException(`User preset not found: ${id}`);
    }

    const existing = this.userPresets[index]!;
    const updated: TrainingPreset = {
      ...existing,
      ...(dto.label       !== undefined && { label:       dto.label }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.config      !== undefined && { config:      { ...existing.config, ...dto.config } }),
      updatedAt: new Date().toISOString(),
    };

    this.userPresets[index] = updated;
    this.persist();
    this.logger.log(`Updated user preset "${id}"`);
    return updated;
  }

  /** Delete a user preset by ID. Throws if not found or if it's a system preset. */
  delete(id: string): void {
    if (this.systemPresets().some(p => p.id === id)) {
      throw Object.assign(
        new Error(`System preset "${id}" cannot be deleted`),
        { statusCode: 422 },
      );
    }

    const index = this.userPresets.findIndex(p => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`User preset not found: ${id}`);
    }

    this.userPresets.splice(index, 1);
    this.persist();
    this.logger.log(`Deleted user preset "${id}"`);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** System presets with source annotation — derived once from static data */
  private systemPresets(): TrainingPreset[] {
    return ALL_PRESETS.map(p => ({ ...p, source: 'system' as const }));
  }

  private loadUserPresets(): TrainingPreset[] {
    if (!fs.existsSync(USER_PRESETS_FILE)) {
      return [];
    }

    try {
      const raw = fs.readFileSync(USER_PRESETS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        this.logger.warn(`${USER_PRESETS_FILE} is not an array — ignoring`);
        return [];
      }

      // Enforce source = 'user' regardless of what's in the file
      // (prevents shipping a settings file that grants system privileges)
      return (parsed as TrainingPreset[]).map(p => ({ ...p, source: 'user' as const }));
    } catch (err) {
      this.logger.warn(
        `Failed to parse ${USER_PRESETS_FILE} — starting with empty user presets: ${(err as Error).message}`,
      );
      return [];
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(USER_PRESETS_FILE);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(USER_PRESETS_FILE, JSON.stringify(this.userPresets, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to save ${USER_PRESETS_FILE}: ${(err as Error).message}`);
    }
  }
}