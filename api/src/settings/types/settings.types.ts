export interface PathsSettings {
  models: string;
  datasets: string;
  outputs: string;
  logs: string;
  sdScripts: string;
  accelerateConfig: string;
  temp: string;
}

export interface TrainingSettings {
  maxConcurrentJobs: number;
  logBufferSize: number;
  cpuThreadsPerProcess: number;
}

export interface AppSettings {
  paths: PathsSettings;
  training: TrainingSettings;
  theme: 'dark' | 'light' | 'auto';
}