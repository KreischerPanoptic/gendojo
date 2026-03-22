import User from '#models/user'
import MFAService from '#services/mfa_service'
import { loginValidator, mfaTokenValidator } from '#validators/auth'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SessionController {
  constructor(private mfaService: MFAService) {}
  // ── Login ──────────────────────────────────────────────────────────────────

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { username, password } = await request.validateUsing(loginValidator)

    // verifyCredentials throws E_INVALID_CREDENTIALS on failure —
    // AdonisJS exception handler redirects back with a flash error automatically.
    const user = await User.verifyCredentials(username, password)

    if (user.isMfaEnabled) {
      // Store user id in session; DO NOT log in yet.
      // The MFA step will call auth.login() after token verification.
      session.put('mfa_pending_user_id', user.id)
      return response.redirect().toRoute('mfa.create')
    }

    await auth.use('web').login(user)
    return response.redirect().toRoute('dashboard')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('session.create')
  }

  // ── MFA second factor ─────────────────────────────────────────────────────

  async mfaCreate({ inertia, session, response }: HttpContext) {
    // Guard: only reachable mid-login (pending MFA session key must exist)
    if (!session.get('mfa_pending_user_id')) {
      return response.redirect().toRoute('session.create')
    }
    return inertia.render('auth/mfa', {})
  }

  async mfaStore({ request, auth, response, session }: HttpContext) {
    const userId = session.get('mfa_pending_user_id')

    if (!userId) {
      return response.redirect().toRoute('session.create')
    }

    const user = await User.find(userId)

    if (!user || !user.mfaSecret) {
      session.forget('mfa_pending_user_id')
      return response.redirect().toRoute('session.create')
    }

    const { token } = await request.validateUsing(mfaTokenValidator)
    const isValid = this.mfaService.verifyToken(user.mfaSecret, token)

    if (!isValid) {
      session.flash('errorsBag', { INVALID_MFA: 'Invalid or expired code' })
      return response.redirect().back()
    }

    session.forget('mfa_pending_user_id')
    await auth.use('web').login(user)
    return response.redirect().toRoute('dashboard')
  }
}
