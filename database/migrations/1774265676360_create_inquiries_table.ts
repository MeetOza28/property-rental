import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'inquiries'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()

            table
                .uuid('property_id')
                .notNullable()
                .references('id')
                .inTable('properties')
                .onDelete('CASCADE')

            table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')

            table.string('name').notNullable()
            table.string('email').notNullable()
            table.string('phone').nullable()

            table.text('message').notNullable()

            table.timestamp('preferred_viewing_date').nullable()

            table
                .enu('status', ['pending', 'in_progress', 'responded', 'closed', 'spam'])
                .defaultTo('pending')

            table
                .uuid('assigned_to')
                .nullable()
                .references('id')
                .inTable('users')
                .onDelete('SET NULL')

            table.text('internal_notes').nullable()

            table.timestamp('responded_at').nullable()

            table.string('ip_address').notNullable()
            table.string('user_agent').nullable()

            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.index(['property_id'])
            table.index(['user_id'])
            table.index(['assigned_to'])
            table.index(['status'])
            table.index(['created_at'])

            table.index(['assigned_to', 'status'])
            table.index(['property_id', 'status'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
