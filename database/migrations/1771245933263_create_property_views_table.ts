import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_views'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table
                .uuid('property_id')
                .notNullable()
                .references('id')
                .inTable('properties')
                .onDelete('CASCADE')
            table.uuid('user_id').nullable()
            table.string('session_id').nullable()
            table.string('ip_address').nullable()
            table.text('user_agent').nullable()
            table.timestamp('viewed_at').defaultTo(this.now())
            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.index(['property_id'])
            table.index(['user_id'])
            table.index(['session_id'])
            table.index(['viewed_at'])
            table.index(['property_id', 'viewed_at'])
            table.index(['user_id', 'viewed_at'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
