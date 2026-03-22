import { TokenType } from '#contracts/enums'
import { TokenSchema } from '#database/schema'
import { beforeSave, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'

export default class Token extends TokenSchema {
  @column({ serializeAs: null })
  public token: string = ''

  @column()
  public type: TokenType = TokenType.HF

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeSave()
  static createHint(token: Token) {
    const computeHint = (raw: string): string => {
      return raw.length > 4 ? raw.slice(-4) : raw
    }
    if (token.$dirty.token) token.hint = computeHint(token.$dirty.token)
  }

  @beforeSave()
  static encryptToken(token: Token) {
    if (token.$dirty.token) {
      token.token = encryption.encrypt(token.$dirty.token)
    }
  }

  decryptToken(): string | null {
    if (!this.token) {
      return null
    }
    return encryption.decrypt(this.token)
  }
}
