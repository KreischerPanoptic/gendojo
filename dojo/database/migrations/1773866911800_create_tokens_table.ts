import { BaseSchema } from '@adonisjs/lucid/schema'
import { TokenType } from '#contracts/enums'

export default class extends BaseSchema {
  protected tableName = 'tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('token').notNullable()
      table.string('hint').notNullable()
      table.enum('type', Object.values(TokenType)).notNullable().unique()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
