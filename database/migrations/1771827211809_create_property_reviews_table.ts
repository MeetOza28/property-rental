import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_reviews'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('property_id').references('id').inTable('properties').onDelete('CASCADE')
            table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
            table.integer('rating').notNullable()
            table.text('comment').nullable()
            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
