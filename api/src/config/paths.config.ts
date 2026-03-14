import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { SettingsService } from '../settings/settings.service';

/**
 * Central path resolver — thin delegate over SettingsService.
 *
 * All paths are ultimately stored in the `settings` SQLite table and editable
 * via PUT /settings. On first boot they are seeded from environment variables
 * (see SettingsService.buildDefaultsFromEnv).
 *
 * PathsConfig adds derived helpers (jobDir, datasetToml, …) on top of the
 * raw paths. It is provided as @Global() in ConfigModule so every module can
 * inject it without a local import.
 *
 * Docker / RunPod env vars (used for first-boot seeding only):
 *   MODELS_PATH             /workspace/models
 *   DATASETS_PATH           /workspace/datasets
 *   OUTPUTS_PATH            /workspace/outputs
 *   LOGS_PATH               /workspace/logs
 *   SD_SCRIPTS_PATH         /app/sd-scripts
 *   ACCELERATE_CONFIG_PATH  /app/config_files/accelerate/runpod.yaml
 *   TEMP_PATH               /workspace/temp
 */
@Injectable()
export class PathsConfig {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Delegated paths (all sourced from DB via SettingsService) ─────────────

  get models(): string {
    return this.settingsService.getPaths().models;
  }

  get datasets(): string {
    return this.settingsService.getPaths().datasets;
  }

  get outputs(): string {
    return this.settingsService.getPaths().outputs;
  }

  /**
   * Root log directory.
   * Individual job logs live in {logs}/jobs/{jobId}/training.log
   */
  get logs(): string {
    return this.settingsService.getPaths().logs;
  }

  /**
   * Path to the sd-scripts git submodule.
   * Training entry-points (flux_train_network.py, etc.) are found here.
   */
  get sdScripts(): string {
    return this.settingsService.getPaths().sdScripts;
  }

  /**
   * Accelerate config YAML passed via --config_file at launch.
   * Editable via UI; falls back to the bundled default_config.yaml on first boot.
   */
  get accelerateConfig(): string {
    return this.settingsService.getPaths().accelerateConfig;
  }

  /**
   * Temp directory root for ephemeral job artefacts (TOML configs, etc.).
   * Files here are cleaned up after the job completes.
   */
  get temp(): string {
    return this.settingsService.getPaths().temp;
  }

  // ── Derived path helpers ──────────────────────────────────────────────────

  /** Working directory for a job's persistent files (log file, job.json manifest) */
  jobDir(jobId: string): string {
    return path.join(this.logs, 'jobs', jobId);
  }

  /** Temp directory for a job's ephemeral config files */
  jobTempDir(jobId: string): string {
    return path.join(this.temp, 'jobs', jobId);
  }

  /** Absolute path to dataset.toml for a job */
  datasetToml(jobId: string): string {
    return path.join(this.jobTempDir(jobId), 'dataset.toml');
  }

  /** Absolute path to train.toml for a job */
  trainToml(jobId: string): string {
    return path.join(this.jobTempDir(jobId), 'train.toml');
  }
}