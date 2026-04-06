import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'users'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('stripe_customer_id').nullable().after('remember_me_token')
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('stripe_customer_id')
        })
    }
}
