import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(['layout'])
            table.index(['status', 'layout', 'rent_amount'])
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['layout'])
            table.dropIndex(['status', 'layout', 'rent_amount'])
        })
    }
}
