import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'saved_searches'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
            table.string('name').notNullable()
            table.json('filters').notNullable()
            table.boolean('email_alerts_enabled').defaultTo(true)
            table
                .enu('alert_frequency', ['instant', 'daily', 'weekly'], {
                    useNative: true,
                    enumName: 'alert_frequency',
                })
                .defaultTo('daily')
            table.timestamp('last_alert_sent_at').nullable()
            table.timestamp('created_at')
            table.timestamp('updated_at')

            table.index(['user_id'])
            table.index(['last_alert_sent_at'])
            table.index(['user_id', 'email_alerts_enabled'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
