import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_favorites'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
            table.uuid('property_id').references('id').inTable('properties').onDelete('CASCADE')
            table.timestamp('created_at')
            table.timestamp('updated_at')
            table.unique(['user_id', 'property_id'])
            table.index(['user_id'])
            table.index(['property_id'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
