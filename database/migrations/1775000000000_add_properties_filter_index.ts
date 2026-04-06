import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'deleted_at', 'ward_id', 'structure', 'rent_amount'],
                'properties_filter_idx'
            )
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'deleted_at', 'ward_id', 'structure', 'rent_amount'],
                'properties_filter_idx'
            )
        })
    }
}
