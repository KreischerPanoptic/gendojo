import { BaseTransformer } from '@adonisjs/core/transformers'
import type Setting from '#models/setting'

export default class SettingTransformer extends BaseTransformer<Setting> {
  toObject() {
    return {
      paths: this.pick(this.resource, [
        'modelsPath',
        'datasetsPath',
        'outputsPath',
        'logsPath',
        'tempPath',
        'sdScriptsPath',
        'accelerateConfigPath',
      ]),
      training: this.pick(this.resource, [
        'maxConcurrentJobs',
        'logBufferSize',
        'cpuThreadsPerProcess',
      ]),
      theme: this.pick(this.resource, ['theme']),
    }
  }
}
