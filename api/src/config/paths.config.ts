import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { SettingsService } from '../system/settings/settings.service';

/**
 * Central path resolver.
 *
 * Values are sourced from SettingsService which merges:
 *   1. Environment variables (defaults)
 *   2. settings.json (overrides via UI)
 *
 * Docker / RunPod env:
 *   MODELS_PATH="/workspace/models"
 *   DATASETS_PATH="/workspace/datasets"
 *   OUTPUTS_PATH="/workspace/outputs"
 *   LOGS_PATH="/workspace/logs"
 *   SD_SCRIPTS_PATH="/app/sd-scripts"
 *   ACCELERATE_CONFIG_PATH="/app/config_files/accelerate/runpod.yaml"
 *   TEMP_PATH="/workspace/temp"
 */
@Injectable()
export class PathsConfig {
  private readonly accelerateConfigResolved: string;
  private readonly tempResolved: string;

  constructor(private readonly settingsService: SettingsService) {
    const repo = path.resolve(__dirname, '..', '..', '..'); // api/src/config → repo root

    this.accelerateConfigResolved =
      process.env['ACCELERATE_CONFIG_PATH'] ??
      path.join(repo, 'configs', 'accelerate', 'default_config.yaml');

    this.tempResolved =
      process.env['TEMP_PATH'] ??
      path.join(repo, 'temp');
  }

  // ------------------------------------------------------------------ //
  //  Paths delegated to SettingsService (editable via UI)
  // ------------------------------------------------------------------ //

  /** Absolute path to the models volume */
  get models(): string {
    return this.settingsService.getPaths().models;
  }

  /** Absolute path to the datasets volume */
  get datasets(): string {
    return this.settingsService.getPaths().datasets;
  }

  /** Absolute path to the training outputs volume */
  get outputs(): string {
    return this.settingsService.getPaths().outputs;
  }

  /**
   * Absolute path to the logs root.
   * Individual job logs live in {logs}/jobs/{jobId}/
   */
  get logs(): string {
    return this.settingsService.getPaths().logs;
  }

  /**
   * Absolute path to the sd-scripts git submodule directory.
   * Training scripts are found here (flux_train_network.py, etc.).
   */
  get sdScripts(): string {
    return this.settingsService.getPaths().sdScripts;
  }

  // ------------------------------------------------------------------ //
  //  Static paths (not editable via UI, only via env)
  // ------------------------------------------------------------------ //

  /**
   * Absolute path to the accelerate config YAML used at launch.
   * If the file does not exist at startup the service logs a warning —
   * accelerate will fall back to its own defaults.
   */
  get accelerateConfig(): string {
    return this.accelerateConfigResolved;
  }

  /**
   * Absolute path to the temp directory root.
   * Used for ephemeral files generated before/during a job run.
   */
  get temp(): string {
    return this.tempResolved;
  }

  // ------------------------------------------------------------------ //
  //  Derived path helpers
  // ------------------------------------------------------------------ //

  /** Directory for a specific job's working files (toml configs, log file) */
  jobDir(jobId: string): string {
    return path.join(this.logs, 'jobs', jobId);
  }

  /** Temp directory for a specific job (dataset.toml, train.toml before launch) */
  jobTempDir(jobId: string): string {
    return path.join(this.temp, 'jobs', jobId);
  }

  /** Path to the dataset config TOML for a job */
  datasetToml(jobId: string): string {
    return path.join(this.jobTempDir(jobId), 'dataset.toml');
  }

  /** Path to the training config TOML for a job */
  trainToml(jobId: string): string {
    return path.join(this.jobTempDir(jobId), 'train.toml');
  }
}