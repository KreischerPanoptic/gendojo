import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Settings from '#models/setting'
import Token from '#models/token'
import SettingTransformer from '#transformers/setting_transformer'
import TokenTransformer from '#transformers/token_transformer'
import MfaService from '#services/mfa_service'

@inject()
export default class SettingsController {
  constructor(private mfaService: MfaService) {}

  async edit({ auth, inertia }: HttpContext) {
    const user = await auth.authenticate()
    const qrData = await this.mfaService.getPendingQrData(user)

    const settingRow = await Settings.first()
    const settings = settingRow ? SettingTransformer.transform(settingRow) : null
    const tokens = await Token.all()

    return inertia.render('settings', {
      mfa: { isMfaEnabled: user.isMfaEnabled, qrData },
      settings: settings,
      tokens: TokenTransformer.transform(tokens),
    })
  }
}
