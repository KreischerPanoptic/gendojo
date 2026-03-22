import { SettingSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import { Theme } from '#contracts/enums'
import type { DateTime } from 'luxon'

export default class Setting extends SettingSchema {
  @column({ serializeAs: null })
  public id: string = 'GLOBAL_CONFIG'

  @column()
  public theme: Theme = Theme.AUTO

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
