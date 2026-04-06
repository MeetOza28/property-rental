import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.table(this.tableName, (table) => {
            table.index(['ward_id', 'status', 'deleted_at'], 'idx_ward_status')
            table.index(['bed_rooms', 'rent_amount', 'status', 'deleted_at'], 'idx_filters')
        })
    }

    async down() {
        this.schema.table(this.tableName, (table) => {
            table.dropIndex(['ward_id', 'status', 'deleted_at'], 'idx_ward_status')
            table.dropIndex(['bed_rooms', 'rent_amount', 'status', 'deleted_at'], 'idx_filters')
        })
    }
}
