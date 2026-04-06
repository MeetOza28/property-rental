import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties' // ✅ FIXED

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'deleted_at', 'bed_rooms', 'rent_amount', 'size_sqm'],
                'idx_search_fast' // optional custom name
            )
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'deleted_at', 'bed_rooms', 'rent_amount', 'size_sqm'],
                'idx_search_fast'
            )
        })
    }
}
