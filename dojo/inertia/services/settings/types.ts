import type { TokenType } from '#contracts/enums'
import type { Data } from '@generated/data'

export type UpdateTheme = Data.Setting['theme']
export type SaveToken = {
  type: TokenType
  token: string
}
export type UpdateTraining = {
  maxConcurrentJobs: number
  logBufferSize: number
  cpuThreadsPerProcess: number
}

export type UpdatePaths = {
  modelsPath: string
  datasetsPath: string
  outputsPath: string
  logsPath: string
  sdScriptsPath: string
}
