import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_comparisons'

    async up() {
        this.schema.createTable('property_comparisons', (table) => {
            table.uuid('id').primary()
            table.uuid('user_id').nullable()
            table.string('session_id').nullable()
            table.jsonb('property_ids').notNullable()
            table.timestamp('expires_at').nullable()

            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.index(['user_id'])
            table.index(['session_id'])

            table.index(['user_id', 'created_at'])
            table.index(['session_id', 'created_at'])

            table.index(['expires_at'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
