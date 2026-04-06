import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(['status', 'deleted_at', 'rent_amount'])
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['status', 'deleted_at', 'rent_amount'])
        })
    }
}
