import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Auth — optional: if not set, auth is disabled (dev mode)
  // On RunPod set via template variables.
  AUTH_USERNAME: Env.schema.string.optional(),
  AUTH_PASSWORD: Env.schema.string.optional(),
  // Paths
  MODELS_PATH: Env.schema.string(),
  DATASETS_PATH: Env.schema.string(),
  OUTPUTS_PATH: Env.schema.string(),
  LOGS_PATH: Env.schema.string(),
  SD_SCRIPTS_PATH: Env.schema.string(),
  ACCELERATE_CONFIG_PATH: Env.schema.string(),
  TEMP_PATH: Env.schema.string(),
  // Settings
  MAX_CONCURRENT_JOBS: Env.schema.number(),
  LOG_BUFFER_SIZE: Env.schema.number(),
  CPU_THREADS_PER_PROCESS: Env.schema.number(),
})
