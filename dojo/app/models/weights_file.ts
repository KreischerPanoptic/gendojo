import type { ModelArchitecture, ModelProvider, ModelStatus } from '#contracts/enums'
import type { ModelCategory, ModelRole } from '#types/models'
import { BaseModel, column, beforeCreate } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { DateTime } from 'luxon'

export default class WeightsFile extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare filename: string

  @column()
  declare relativePath: string

  @column()
  declare architecture: ModelArchitecture | null

  @column()
  declare category: ModelCategory

  @column()
  declare role: ModelRole

  @column()
  declare provider: ModelProvider

  @column()
  declare providerId: string | null

  @column()
  declare expectedSha256: string | null

  @column()
  declare sizeBytes: string

  @column()
  declare status: ModelStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(weights: WeightsFile) {
    if (!weights.id) {
      weights.id = randomUUID()
    }
  }
}
