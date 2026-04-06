import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'audit_logs'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()

            table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
            table.string('action').notNullable()
            table.string('entity_type').notNullable()
            table.uuid('entity_id').nullable()

            table.json('old_values').nullable()
            table.json('new_values').nullable()

            table.string('ip_address').nullable()
            table.text('user_agent').nullable()
            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.index(['user_id'])
            table.index(['entity_type'])
            table.index(['entity_id'])
            table.index(['created_at'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
