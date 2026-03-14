/**
 * Typed return shapes for SettingsService helper methods.
 * Used as the return type of getPaths() and getTraining(),
 * which PathsConfig and other consumers depend on.
 */

export interface PathsSettings {
  models:          string;
  datasets:        string;
  outputs:         string;
  logs:            string;
  sdScripts:       string;
  accelerateConfig: string;
  temp:            string;
}

export interface TrainingSettings {
  maxConcurrentJobs:    number;
  logBufferSize:        number;
  cpuThreadsPerProcess: number;
}

export interface AppSettings {
  paths:    PathsSettings;
  training: TrainingSettings;
  theme:    'dark' | 'light' | 'auto';
}