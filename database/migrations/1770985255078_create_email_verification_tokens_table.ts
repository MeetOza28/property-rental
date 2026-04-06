import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'email_verification_tokens'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table
                .uuid('user_id')
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')
            table.string('token').notNullable().unique()
            table.timestamp('expires_at').notNullable()
            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
