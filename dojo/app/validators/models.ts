import { ModelArchitecture } from '#contracts/enums'
import { MODEL_ROLES, MODEL_CATEGORIES } from '#types/models'
import vine from '@vinejs/vine'

export const filtersValidator = vine.create({
  arch: vine.enum(Object.values(ModelArchitecture)).optional(),
  role: vine.enum(MODEL_ROLES).optional(),
  category: vine.enum(MODEL_CATEGORIES).optional(),
})

// export const tokenValidator = vine.create({
//   type: vine.enum(Object.values(TokenType)),
//   token: vine.string().trim().minLength(1),
// })

// export const trainingValidator = vine.create({
//   maxConcurrentJobs: vine.number().min(1).max(8),
//   logBufferSize: vine.number().min(100).max(10000),
//   cpuThreadsPerProcess: vine.number().min(1).max(32),
// })

// export const pathsValidator = vine.create({
//   modelsPath: vine.string().trim(),
//   datasetsPath: vine.string().trim(),
//   outputsPath: vine.string().trim(),
//   logsPath: vine.string().trim(),
//   sdScriptsPath: vine.string().trim(),
// })
