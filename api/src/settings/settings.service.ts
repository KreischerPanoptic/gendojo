import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';

import { Settings } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type { PathsSettings, TrainingSettings } from './types/settings.types';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  /** In-memory cache — always in sync with the DB after onModuleInit */
  private cachedSettings!: Settings;

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initDatabase();
    this.logger.log('Settings loaded from SQLite into memory cache');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Returns the full settings record as stored in the DB. */
  getSettings(): Settings {
    return this.cachedSettings;
  }

  /**
   * Returns all resolved path settings.
   * This is the single source of truth for paths — PathsConfig delegates here.
   * Includes static paths (accelerateConfig, temp) even though they are
   * editable via the UI, because they live in the same DB row.
   */
  getPaths(): PathsSettings {
    return {
      models:          this.cachedSettings.modelsPath,
      datasets:        this.cachedSettings.datasetsPath,
      outputs:         this.cachedSettings.outputsPath,
      logs:            this.cachedSettings.logsPath,
      sdScripts:       this.cachedSettings.sdScriptsPath,
      accelerateConfig: this.cachedSettings.accelerateConfigPath,
      temp:            this.cachedSettings.tempPath,
    };
  }

  /** Returns training runtime constants. */
  getTraining(): TrainingSettings {
    return {
      maxConcurrentJobs:    this.cachedSettings.maxConcurrentJobs,
      logBufferSize:        this.cachedSettings.logBufferSize,
      cpuThreadsPerProcess: this.cachedSettings.cpuThreadsPerProcess,
    };
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    const patch: Partial<Settings> = {};

    if (dto.paths) {
      if (dto.paths.models           != null) patch.modelsPath          = dto.paths.models;
      if (dto.paths.datasets         != null) patch.datasetsPath        = dto.paths.datasets;
      if (dto.paths.outputs          != null) patch.outputsPath         = dto.paths.outputs;
      if (dto.paths.logs             != null) patch.logsPath            = dto.paths.logs;
      if (dto.paths.sdScripts        != null) patch.sdScriptsPath       = dto.paths.sdScripts;
      if (dto.paths.accelerateConfig != null) patch.accelerateConfigPath = dto.paths.accelerateConfig;
      if (dto.paths.temp             != null) patch.tempPath            = dto.paths.temp;
    }

    if (dto.training) {
      if (dto.training.maxConcurrentJobs    != null) patch.maxConcurrentJobs    = dto.training.maxConcurrentJobs;
      if (dto.training.logBufferSize        != null) patch.logBufferSize        = dto.training.logBufferSize;
      if (dto.training.cpuThreadsPerProcess != null) patch.cpuThreadsPerProcess = dto.training.cpuThreadsPerProcess;
    }

    if (dto.theme != null) {
      patch.theme = dto.theme;
    }

    await this.settingsRepo.update({ id: 'GLOBAL_CONFIG' }, patch);
    this.cachedSettings = await this.settingsRepo.findOneByOrFail({ id: 'GLOBAL_CONFIG' });

    this.logger.log('Settings updated in SQLite and memory cache');
    return this.cachedSettings;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async initDatabase(): Promise<void> {
    let settings = await this.settingsRepo.findOneBy({ id: 'GLOBAL_CONFIG' });

    if (!settings) {
      this.logger.log('No settings row found — seeding from env / fallback defaults');
      settings = this.settingsRepo.create(this.buildDefaultsFromEnv());
      await this.settingsRepo.save(settings);
    }

    this.cachedSettings = settings;
  }

  /**
   * Seeds the initial row from environment variables.
   * Fallback paths are relative to the repo root so the app works out-of-box
   * in dev without Docker. In production (RunPod) all env vars are set.
   */
  private buildDefaultsFromEnv(): Settings {
    // process.cwd() is api/ at runtime; repo root is one level up
    const repoRoot = path.resolve(process.cwd(), '..');

    const s = new Settings();
    s.id             = 'GLOBAL_CONFIG';
    s.modelsPath     = process.env['MODELS_PATH']    ?? path.join(repoRoot, 'models');
    s.datasetsPath   = process.env['DATASETS_PATH']  ?? path.join(repoRoot, 'datasets');
    s.outputsPath    = process.env['OUTPUTS_PATH']   ?? path.join(repoRoot, 'outputs');
    s.logsPath       = process.env['LOGS_PATH']      ?? path.join(repoRoot, 'logs');
    s.sdScriptsPath  = process.env['SD_SCRIPTS_PATH'] ?? path.join(repoRoot, 'sd-scripts');
    s.accelerateConfigPath =
      process.env['ACCELERATE_CONFIG_PATH'] ??
      path.join(repoRoot, 'configs', 'accelerate', 'default_config.yaml');
    s.tempPath       = process.env['TEMP_PATH'] ?? path.join(repoRoot, 'temp');

    s.maxConcurrentJobs    = parseInt(process.env['MAX_CONCURRENT_JOBS']     ?? '1',    10);
    s.logBufferSize        = parseInt(process.env['LOG_BUFFER_SIZE']         ?? '2000', 10);
    s.cpuThreadsPerProcess = parseInt(process.env['CPU_THREADS_PER_PROCESS'] ?? '2',    10);

    s.theme = 'auto';

    return s;
  }
}