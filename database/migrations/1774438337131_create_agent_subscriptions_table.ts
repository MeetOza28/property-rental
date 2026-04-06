import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'agent_subscriptions'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table
                .uuid('user_id')
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')
            table
                .uuid('plan_id')
                .nullable()
                .references('id')
                .inTable('subscription_plans')
                .onDelete('SET NULL')
            table.string('stripe_customer_id').nullable()
            table.string('stripe_subscription_id').nullable()
            table
                .enu('status', [
                    'active',
                    'trialing',
                    'past_due',
                    'canceled',
                    'unpaid',
                    'incomplete',
                    'incomplete_expired',
                ])
                .notNullable()
                .defaultTo('incomplete')
            table.timestamp('current_period_start').nullable()
            table.timestamp('current_period_end').nullable()
            table.timestamp('cancel_at').nullable()
            table.boolean('cancel_at_period_end').defaultTo(false)
            table.timestamp('canceled_at').nullable()
            table.timestamp('ended_at').nullable()
            table.json('metadata').nullable()
            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.unique(['user_id'])
            table.index(['stripe_customer_id'])
            table.index(['stripe_subscription_id'])
            table.index(['status'])
        })
    }

    async down() {
        await this.schema.dropTable(this.tableName)
    }
}
