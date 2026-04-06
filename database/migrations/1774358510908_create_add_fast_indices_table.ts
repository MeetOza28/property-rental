import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'deleted_at', 'structure', 'size_sqm', 'rent_amount'],
                'fast_filter_idx'
            )
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'deleted_at', 'structure', 'size_sqm', 'rent_amount'],
                'fast_filter_idx'
            )
        })
    }
}
