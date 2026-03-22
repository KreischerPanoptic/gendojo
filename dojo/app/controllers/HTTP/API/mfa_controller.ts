import { mfaTokenValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'
import MFAService from '#services/mfa_service'
import { inject } from '@adonisjs/core'

@inject()
export default class MFAController {
  constructor(private mfaService: MFAService) {}
  /**
   * Generate a new TOTP secret, persist it, and return the QR code as JSON.
   */
  async setup({ auth, response }: HttpContext) {
    const user = await auth.authenticate()

    const setupData = await this.mfaService.setup(user)
    return response.json(setupData)
  }

  /**
   * Verify the TOTP token. Return 400 on error, 200 on success.
   */
  async enable({ request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    const { token } = await request.validateUsing(mfaTokenValidator)

    if (!user.mfaSecret) {
      return response.badRequest({ error: 'Run setup first' })
    }

    const isValid = await this.mfaService.verifyAndEnable(user, token)

    if (!isValid) {
      return response.badRequest({ error: 'Invalid or expired code' })
    }

    return response.ok({ message: 'MFA enabled successfully' })
  }

  /**
   * Disable MFA and clear the secret.
   */
  async disable({ auth, response }: HttpContext) {
    const user = await auth.authenticate()

    await this.mfaService.disable(user)
    return response.ok({ message: 'MFA disabled successfully' })
  }
}
