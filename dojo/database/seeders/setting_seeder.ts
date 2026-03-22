import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Setting from '#models/setting'
import env from '#start/env'
import path from 'node:path'
import { Theme } from '#contracts/enums'

export default class extends BaseSeeder {
  async run() {
    const repoRoot = path.resolve(process.cwd(), '..')
    await Setting.create({
      id: 'GLOBAL_CONFIG',
      modelsPath: env.get('MODELS_PATH', path.join(repoRoot, 'models')),
      datasetsPath: env.get('DATASETS_PATH', path.join(repoRoot, 'datasets')),
      outputsPath: env.get('OUTPUTS_PATH', path.join(repoRoot, 'outputs')),
      logsPath: env.get('LOGS_PATH', path.join(repoRoot, 'logs')),
      sdScriptsPath: env.get('SD_SCRIPTS_PATH', path.join(repoRoot, 'sd-scripts')),
      accelerateConfigPath: env.get(
        'ACCELERATE_CONFIG_PATH',
        path.join(repoRoot, 'configs', 'accelerate', 'default_config.yaml')
      ),
      tempPath: env.get('TEMP_PATH', path.join(repoRoot, 'temp')),
      maxConcurrentJobs: env.get('MAX_CONCURRENT_JOBS', 1),
      logBufferSize: env.get('LOG_BUFFER_SIZE', 2000),
      cpuThreadsPerProcess: env.get('CPU_THREADS_PER_PROCESS', 2),
      theme: Theme.AUTO,
    })
  }
}
