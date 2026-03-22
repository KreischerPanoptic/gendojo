import Settings from '#models/setting'
import Token from '#models/token'
import type { Theme, TokenType } from '#contracts/enums'

export default class SettingsService {
  async getSettings(): Promise<Settings> {
    return await Settings.firstOrFail()
  }

  async updateTheme(theme: Theme) {
    const setting = await Settings.firstOrFail()
    setting.theme = theme
    await setting.save()
  }

  async getTokens(): Promise<Token[]> {
    return await Token.all()
  }

  async getToken(type: TokenType): Promise<Token | null> {
    return await Token.findBy('type', type)
  }

  async saveToken(type: TokenType, token: string): Promise<Token> {
    return await Token.updateOrCreate({ type }, { token })
  }

  async deleteToken(type: TokenType) {
    await Token.query().where('type', type).delete()
  }

  async updateTraining(payload: {
    maxConcurrentJobs: number
    logBufferSize: number
    cpuThreadsPerProcess: number
  }) {
    const setting = await Settings.firstOrFail()
    setting.merge(payload)
    await setting.save()
  }

  async updatePaths(payload: {
    modelsPath: string
    datasetsPath: string
    outputsPath: string
    logsPath: string
    sdScriptsPath: string
  }) {
    const setting = await Settings.firstOrFail()
    setting.merge(payload)
    await setting.save()
  }
}
