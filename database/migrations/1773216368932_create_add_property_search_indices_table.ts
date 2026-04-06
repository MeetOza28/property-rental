import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'ward_id', 'rent_amount', 'created_at'],
                'properties_search_index'
            )
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'ward_id', 'rent_amount', 'created_at'],
                'properties_search_index'
            )
        })
    }
}
