import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Settings } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  
  private cachedSettings!: Settings;

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initDatabase();
    this.logger.log('Settings loaded into memory cache from SQLite');
  }

  // ── Public API ─────────────────────────────────

  getSettings(): Settings {
    return this.cachedSettings;
  }

  getPaths() {
    return {
      models: this.cachedSettings.modelsPath,
      datasets: this.cachedSettings.datasetsPath,
      outputs: this.cachedSettings.outputsPath,
      logs: this.cachedSettings.logsPath,
      sdScripts: this.cachedSettings.sdScriptsPath,
    };
  }

  getTraining() {
    return {
      maxConcurrentJobs: this.cachedSettings.maxConcurrentJobs,
      logBufferSize: this.cachedSettings.logBufferSize,
      cpuThreadsPerProcess: this.cachedSettings.cpuThreadsPerProcess,
    };
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    const updateData: Partial<Settings> = {};

    if (dto.paths) {
      if (dto.paths.models) updateData.modelsPath = dto.paths.models;
      if (dto.paths.datasets) updateData.datasetsPath = dto.paths.datasets;
      if (dto.paths.outputs) updateData.outputsPath = dto.paths.outputs;
      if (dto.paths.logs) updateData.logsPath = dto.paths.logs;
      if (dto.paths.sdScripts) updateData.sdScriptsPath = dto.paths.sdScripts;
      if (dto.paths.accelerateConfig) updateData.accelerateConfigPath = dto.paths.accelerateConfig;
      if (dto.paths.temp) updateData.tempPath = dto.paths.temp;
    }

    if (dto.training) {
      if (dto.training.maxConcurrentJobs !== undefined) updateData.maxConcurrentJobs = dto.training.maxConcurrentJobs;
      if (dto.training.logBufferSize !== undefined) updateData.logBufferSize = dto.training.logBufferSize;
      if (dto.training.cpuThreadsPerProcess !== undefined) updateData.cpuThreadsPerProcess = dto.training.cpuThreadsPerProcess;
    }

    if (dto.theme) {
      updateData.theme = dto.theme;
    }

    await this.settingsRepo.update({ id: 'GLOBAL_CONFIG' }, updateData);
    this.cachedSettings = await this.settingsRepo.findOneByOrFail({ id: 'GLOBAL_CONFIG' });
    
    this.logger.log('Settings updated in SQLite and memory cache');
    return this.cachedSettings;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async initDatabase(): Promise<void> {
    let settings = await this.settingsRepo.findOneBy({ id: 'GLOBAL_CONFIG' });

    if (!settings) {
      this.logger.log('No settings found in DB. Initializing from process.env (RunPod/Docker defaults)...');
      
      const defaults = this.buildDefaultsFromEnv();
      settings = this.settingsRepo.create(defaults);
      await this.settingsRepo.save(settings);
    }

    this.cachedSettings = settings;
  }

  private buildDefaultsFromEnv(): Partial<Settings> {
    const repoRoot = path.resolve(process.cwd(), '..'); 

    return {
      id: 'GLOBAL_CONFIG',
      
      modelsPath:    process.env['MODELS_PATH']    ?? path.join(repoRoot, 'models'),
      datasetsPath:  process.env['DATASETS_PATH']  ?? path.join(repoRoot, 'datasets'),
      outputsPath:   process.env['OUTPUTS_PATH']   ?? path.join(repoRoot, 'outputs'),
      logsPath:      process.env['LOGS_PATH']      ?? path.join(repoRoot, 'logs'),
      sdScriptsPath: process.env['SD_SCRIPTS_PATH'] ?? path.join(repoRoot, 'sd-scripts'),
      accelerateConfigPath: process.env['ACCELERATE_CONFIG_PATH'] ?? path.join(repoRoot, 'configs/accelerate/default_config.yaml'),
      tempPath:      process.env['TEMP_PATH']      ?? path.join(repoRoot, 'temp'),

      maxConcurrentJobs:   parseInt(process.env['MAX_CONCURRENT_JOBS']    ?? '1', 10),
      logBufferSize:       parseInt(process.env['LOG_BUFFER_SIZE']        ?? '2000', 10),
      cpuThreadsPerProcess: parseInt(process.env['CPU_THREADS_PER_PROCESS'] ?? '2', 10),
      
      theme: 'auto',
    };
  }
}