// ─────────────────────────────────────────────────────────────────────────────
// Mirror of api/src/system/settings/settings.service.ts + settings.controller.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface PathsSettings {
  models: string;
  datasets: string;
  outputs: string;
  logs: string;
  sdScripts: string;
}

export interface TrainingSettings {
  maxConcurrentJobs: number;
  logBufferSize: number;
  cpuThreadsPerProcess: number;
}

export interface AppSettings {
  paths: PathsSettings;
  training: TrainingSettings;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/paths — includes static paths not editable via UI
// ─────────────────────────────────────────────────────────────────────────────

export interface PathsInfo {
  models: string;
  datasets: string;
  outputs: string;
  logs: string;
  sdScripts: string;
  accelerateConfig: string;
  temp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings — partial update
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdatePathsDto {
  models?: string;
  datasets?: string;
  outputs?: string;
  logs?: string;
  sdScripts?: string;
}

export interface UpdateTrainingDto {
  maxConcurrentJobs?: number;
  logBufferSize?: number;
  cpuThreadsPerProcess?: number;
}

export interface UpdateSettingsDto {
  paths?: UpdatePathsDto;
  training?: UpdateTrainingDto;
}