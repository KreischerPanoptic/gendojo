import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weights_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable()
      table.string('filename').notNullable()
      table.string('relative_path').notNullable()
      table.string('architecture', 50).notNullable().index()
      table.string('category', 50).notNullable().index()
      table.string('role', 50).notNullable().index()
      table.string('provider', 50).notNullable().index()
      table.string('provider_id').nullable().index()
      table.string('expected_sha256', 64).nullable()
      table.bigInteger('size_bytes').notNullable()
      table.string('status', 30).notNullable().defaultTo('ready').index()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
