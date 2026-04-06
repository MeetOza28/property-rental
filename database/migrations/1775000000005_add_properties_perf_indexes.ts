import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            // Composite index tailored to common filters (status/deleted + structure/layout/ward + size & rent ranges)
            table.index(
                [
                    'status',
                    'deleted_at',
                    'structure',
                    'ward_id',
                    'layout',
                    'size_sqm',
                    'rent_amount',
                ],
                'properties_filter_perf_idx'
            )

            // Smaller composite to help bed_rooms + rent range when layout/ward not provided
            table.index(
                ['status', 'deleted_at', 'structure', 'bed_rooms', 'rent_amount'],
                'properties_bedrooms_rent_idx'
            )
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                [
                    'status',
                    'deleted_at',
                    'structure',
                    'ward_id',
                    'layout',
                    'size_sqm',
                    'rent_amount',
                ],
                'properties_filter_perf_idx'
            )
            table.dropIndex(
                ['status', 'deleted_at', 'structure', 'bed_rooms', 'rent_amount'],
                'properties_bedrooms_rent_idx'
            )
        })
    }
}
