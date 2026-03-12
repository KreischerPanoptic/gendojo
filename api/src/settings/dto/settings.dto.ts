export interface SettingsDto {
    id: string,
    modelsPath: string,
    datasetsPath: string,
    outputsPath: string,
    logsPath: string,
    sdScriptsPath: string,
    accelerateConfigPath: string,
    tempPath: string,
    maxConcurrentJobs?: number,
    logBufferSize?: number,
    cpuThreadsPerProcess?: number,
    theme: 'dark' | 'light' | 'auto'
}