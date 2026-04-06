import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'refresh_tokens'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table
                .uuid('user_id')
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')

            table.string('token_hash', 128).notNullable().unique()
            table.timestamp('expires_at').notNullable()
            table.timestamp('created_at').notNullable().defaultTo(this.now())

            table.index(['user_id'])
            table.index(['expires_at'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
