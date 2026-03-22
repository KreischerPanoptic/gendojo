import type User from '#models/user'
import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

export default class MFAService {
  async setup(user: User) {
    const secret = generateSecret()

    user.mfaSecret = secret
    user.isMfaEnabled = false
    await user.save()

    const otpauth = generateURI({ label: user.username, issuer: 'GenDojo', secret })
    const qrCode = await QRCode.toDataURL(otpauth)

    return { secret, qrCode, url: otpauth }
  }

  async getPendingQrData(user: User) {
    if (!user.mfaSecret || user.isMfaEnabled) return null

    const url = generateURI({
      label: user.username,
      issuer: 'GenDojo',
      secret: user.mfaSecret,
    })

    const qrCode = await QRCode.toDataURL(url)
    return { qrCode, secret: user.mfaSecret, url }
  }

  async verifyAndEnable(user: User, token: string): Promise<boolean> {
    if (!user.mfaSecret) return false

    const isValid = await verify({ token, secret: user.mfaSecret })

    if (isValid.valid) {
      user.isMfaEnabled = true
      await user.save()
    }

    return isValid.valid
  }

  async verifyToken(secret: string, token: string): Promise<boolean> {
    const isValid = await verify({ token, secret })
    return isValid.valid
  }

  async disable(user: User) {
    user.isMfaEnabled = false
    user.mfaSecret = null
    await user.save()
  }
}
