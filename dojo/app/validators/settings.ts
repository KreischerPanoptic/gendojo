import { Theme } from '#contracts/enums'
import vine from '@vinejs/vine'

export const themeValidator = vine.create({
  theme: vine.enum(Object.values(Theme)),
})

export const tokenValidator = vine.create({
  token: vine.string().trim().minLength(1),
})

export const trainingValidator = vine.create({
  maxConcurrentJobs: vine.number().min(1).max(8),
  logBufferSize: vine.number().min(100).max(10000),
  cpuThreadsPerProcess: vine.number().min(1).max(32),
})

export const pathsValidator = vine.create({
  modelsPath: vine.string().trim(),
  datasetsPath: vine.string().trim(),
  outputsPath: vine.string().trim(),
  logsPath: vine.string().trim(),
  sdScriptsPath: vine.string().trim(),
})
