import { BaseSchema } from '@adonisjs/lucid/schema'
import env from '#start/env'
import path from 'node:path'
import { Theme } from '#contracts/enums'

export default class extends BaseSchema {
  protected tableName = 'settings'
  async up() {
    const repoRoot = path.resolve(process.cwd(), '..')
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().defaultTo('GLOBAL_CONFIG')
      table.string('models_path').defaultTo(env.get('MODELS_PATH', path.join(repoRoot, 'models')))
      table
        .string('datasets_path')
        .defaultTo(env.get('DATASETS_PATH', path.join(repoRoot, 'datasets')))
      table
        .string('outputs_path')
        .defaultTo(env.get('OUTPUTS_PATH', path.join(repoRoot, 'outputs')))
      table.string('logs_path').defaultTo(env.get('LOGS_PATH', path.join(repoRoot, 'logs')))
      table
        .string('sd_scripts_path')
        .defaultTo(env.get('SD_SCRIPTS_PATH', path.join(repoRoot, 'sd-scripts')))
      table
        .string('accelerate_config_path')
        .defaultTo(
          env.get(
            'ACCELERATE_CONFIG_PATH',
            path.join(repoRoot, 'configs', 'accelerate', 'default_config.yaml')
          )
        )
      table.string('temp_path').defaultTo(env.get('TEMP_PATH', path.join(repoRoot, 'temp')))
      table.integer('max_concurrent_jobs').defaultTo(env.get('MAX_CONCURRENT_JOBS', 1))
      table.integer('log_buffer_size').defaultTo(env.get('LOG_BUFFER_SIZE', 2000))
      table.integer('cpu_threads_per_process').defaultTo(env.get('CPU_THREADS_PER_PROCESS', 2))
      table.enum('theme', Object.values(Theme)).defaultTo(Theme.AUTO).notNullable()

      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
