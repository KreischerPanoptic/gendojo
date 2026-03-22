import vine from '@vinejs/vine'

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginValidator = vine.create({
  username: vine.string().trim().minLength(1),
  password: vine.string().minLength(1),
})

// ─── MFA ──────────────────────────────────────────────────────────────────────

export const mfaTokenValidator = vine.create({
  /**
   * Standard 6-digit TOTP token.
   * fixedLength ensures we reject obviously wrong inputs early,
   * before hitting the TOTP verification logic.
   */
  token: vine.string().fixedLength(6),
})
