import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

// ─── Auth finder ──────────────────────────────────────────────────────────────
// Lookup by `username` column instead of the default `email`.
// hash.use('scrypt') matches the config/hash.ts default driver.
// ─────────────────────────────────────────────────────────────────────────────

const AuthFinder = withAuthFinder(() => hash.use('argon'), {
  uids: ['username'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  /**
   * Excluded from serialization — never leaks into Inertia shared props or API responses.
   * The @beforeSave hook hashes it transparently on create/update.
   */
  @column({ serializeAs: null })
  declare password: string

  /**
   * Excluded from serialization — raw TOTP secret must never reach the client
   * except during the one-time QR setup flow (handled explicitly in SettingsController).
   */
  @column({ serializeAs: null })
  declare mfaSecret: string | null

  @column()
  declare isMfaEnabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
