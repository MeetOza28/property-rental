import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'inquiry_messages'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()

            table
                .uuid('inquiry_id')
                .notNullable()
                .references('id')
                .inTable('inquiries')
                .onDelete('CASCADE')

            table.uuid('sender_id').nullable()

            table.enu('sender_type', ['user', 'agent', 'system']).notNullable()

            table.text('message').notNullable()

            table.json('attachments').nullable()

            table.boolean('is_read').defaultTo(false)

            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.index(['inquiry_id'])
            table.index(['sender_id'])
            table.index(['is_read'])
            table.index(['created_at'])

            table.index(['inquiry_id', 'created_at'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
