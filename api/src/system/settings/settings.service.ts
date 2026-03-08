import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface PathsSettings {
  models: string;
  datasets: string;
  outputs: string;
  logs: string;
  sdScripts: string;
}

export interface TrainingSettings {
  /** Max simultaneous running jobs. RunPod = 1 GPU, so default 1. */
  maxConcurrentJobs: number;
  /** Ring-buffer size for in-memory log lines per job. */
  logBufferSize: number;
  /** Passed to accelerate --num_cpu_threads_per_process */
  cpuThreadsPerProcess: number;
}

export interface AppSettings {
  paths: PathsSettings;
  training: TrainingSettings;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_FILE =
  process.env['SETTINGS_FILE'] ||
  path.resolve(process.env['WORKSPACE_ROOT'] ?? '/workspace/gendojo', 'settings.json');

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private settings!: AppSettings;

  onModuleInit(): void {
    this.settings = this.load();
    this.logger.log(`Settings loaded from ${SETTINGS_FILE}`);
    this.logger.debug(JSON.stringify(this.settings, null, 2));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getSettings(): AppSettings {
    return this.settings;
  }

  getPaths(): PathsSettings {
    return this.settings.paths;
  }

  getTraining(): TrainingSettings {
    return this.settings.training;
  }

  update(dto: UpdateSettingsDto): AppSettings {
    if (dto.paths) {
      this.settings.paths = {
        ...this.settings.paths,
        ...this.stripUndefined(dto.paths),
      };
    }

    if (dto.training) {
      this.settings.training = {
        ...this.settings.training,
        ...this.stripUndefined(dto.training),
      };
    }

    this.persist();
    this.logger.log('Settings updated and persisted');
    return this.settings;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private load(): AppSettings {
    const defaults = this.buildDefaults();

    if (!fs.existsSync(SETTINGS_FILE)) {
      this.logger.log('No settings.json found — using defaults');
      return defaults;
    }

    try {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const saved = JSON.parse(raw) as Partial<AppSettings>;

      return {
        paths: { ...defaults.paths, ...(saved.paths ?? {}) },
        training: { ...defaults.training, ...(saved.training ?? {}) },
      };
    } catch (err) {
      this.logger.warn(
        `Failed to parse ${SETTINGS_FILE} — using defaults: ${(err as Error).message}`,
      );
      return defaults;
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(SETTINGS_FILE);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(this.settings, null, 2),
        'utf-8',
      );
    } catch (err) {
      this.logger.error(`Failed to save settings.json: ${(err as Error).message}`);
    }
  }

  private buildDefaults(): AppSettings {
    const repo = path.resolve(process.cwd(), '..');

    return {
      paths: {
        models:    process.env['MODELS_PATH']    ?? path.join(repo, 'models'),
        datasets:  process.env['DATASETS_PATH']  ?? path.join(repo, 'datasets'),
        outputs:   process.env['OUTPUTS_PATH']   ?? path.join(repo, 'outputs'),
        logs:      process.env['LOGS_PATH']      ?? path.join(repo, 'logs'),
        sdScripts: process.env['SD_SCRIPTS_PATH'] ?? path.join(repo, 'sd-scripts'),
      },
      training: {
        maxConcurrentJobs:   parseInt(process.env['MAX_CONCURRENT_JOBS']    ?? '1',    10),
        logBufferSize:       parseInt(process.env['LOG_BUFFER_SIZE']        ?? '2000', 10),
        cpuThreadsPerProcess: parseInt(process.env['CPU_THREADS_PER_PROCESS'] ?? '1',   10),
      },
    };
  }

  private stripUndefined<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }
}