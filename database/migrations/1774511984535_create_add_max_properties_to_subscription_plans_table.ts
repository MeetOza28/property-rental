import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'subscription_plans'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('max_properties').nullable()
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('max_properties')
        })
    }
}
