import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import SettingsService from '#services/settings_service'
import {
  themeValidator,
  pathsValidator,
  tokenValidator,
  trainingValidator,
} from '#validators/settings'
import type { TokenType } from '#contracts/enums'
import TokenTransformer from '#transformers/token_transformer'

@inject()
export default class SettingsApiController {
  constructor(private settingsService: SettingsService) {}

  async theme({ response }: HttpContext) {
    const settings = await this.settingsService.getSettings()
    return response.json(settings.theme)
  }

  async changeTheme({ request, response }: HttpContext) {
    const payload = await request.validateUsing(themeValidator)
    await this.settingsService.updateTheme(payload.theme)
    const settings = await this.settingsService.getSettings()
    return response.json(settings.theme)
  }

  async tokens({ response }: HttpContext) {
    const tokens = await this.settingsService.getTokens()
    return response.json({ tokens: TokenTransformer.transform(tokens) })
  }

  async token({ params, response }: HttpContext) {
    const token = await this.settingsService.getToken(params.type)
    return response.json({ token: token ? TokenTransformer.transform(token) : null })
  }

  async saveToken({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(tokenValidator)
    const token = await this.settingsService.saveToken(params.type as TokenType, payload.token)
    return response.json({
      token: { type: params.type as TokenType, hint: TokenTransformer.transform(token) },
    })
  }

  async deleteToken({ params, response }: HttpContext) {
    await this.settingsService.deleteToken(params.type as TokenType)
    return response.json({ token: { type: params.type as TokenType, hint: null } })
  }

  async training({ response }: HttpContext) {
    const settings = await this.settingsService.getSettings()
    return response.json({
      training: {
        maxConcurrentJobs: settings.maxConcurrentJobs,
        logBufferSize: settings.logBufferSize,
        cpuThreadsPerProcess: settings.cpuThreadsPerProcess,
      },
    })
  }

  async updateTraining({ request, response }: HttpContext) {
    const payload = await request.validateUsing(trainingValidator)
    await this.settingsService.updateTraining(payload)
    const settings = await this.settingsService.getSettings()
    return response.json({
      training: {
        maxConcurrentJobs: settings.maxConcurrentJobs,
        logBufferSize: settings.logBufferSize,
        cpuThreadsPerProcess: settings.cpuThreadsPerProcess,
      },
    })
  }

  async paths({ response }: HttpContext) {
    const settings = await this.settingsService.getSettings()
    return response.json({
      paths: {
        modelsPath: settings.modelsPath,
        datasetsPath: settings.datasetsPath,
        outputsPath: settings.outputsPath,
        logsPath: settings.logsPath,
        tempPath: settings.tempPath,
        sdScriptsPath: settings.sdScriptsPath,
        accelerateConfigPath: settings.accelerateConfigPath,
      },
    })
  }

  async updatePaths({ request, response }: HttpContext) {
    const payload = await request.validateUsing(pathsValidator)
    await this.settingsService.updatePaths(payload)
    const settings = await this.settingsService.getSettings()
    return response.json({
      paths: {
        modelsPath: settings.modelsPath,
        datasetsPath: settings.datasetsPath,
        outputsPath: settings.outputsPath,
        logsPath: settings.logsPath,
        tempPath: settings.tempPath,
        sdScriptsPath: settings.sdScriptsPath,
        accelerateConfigPath: settings.accelerateConfigPath,
      },
    })
  }
}
