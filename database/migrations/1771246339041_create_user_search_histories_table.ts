import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'user_search_histories'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('user_id').nullable()
            table.string('session_id').nullable()
            table.text('search_query').nullable()
            table.json('filters').nullable()
            table.integer('results_count').nullable()
            table.uuid('clicked_property_id').nullable()
            table.timestamp('searched_at').defaultTo(this.now())

            table.index(['user_id'])
            table.index(['session_id'])
            table.index(['searched_at'])
            table.index(['clicked_property_id'])
            table.index(['user_id', 'searched_at'])

            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
