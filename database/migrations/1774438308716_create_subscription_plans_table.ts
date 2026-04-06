import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'subscription_plans'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.string('name').notNullable()
            table.string('description').nullable()
            table.string('stripe_price_id').notNullable()
            table.string('stripe_product_id').nullable()
            table.decimal('amount', 12, 2).notNullable().defaultTo(0)
            table.string('currency').notNullable().defaultTo('usd')
            table.string('interval').notNullable().defaultTo('month')
            table.boolean('is_active').notNullable().defaultTo(true)
            table.timestamp('created_at')
            table.timestamp('updated_at')
            table.index(['stripe_price_id'])
            table.index(['is_active'])
        })
    }

    async down() {
        await this.schema.dropTable(this.tableName)
    }
}
