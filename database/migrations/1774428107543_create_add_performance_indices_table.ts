import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddPerformanceIndexes extends BaseSchema {
    protected propertiesTable = 'properties'
    protected stationsTable = 'property_train_stations'

    async up() {
        // 🚀 Index for likes_desc sorting (favorites_count + view_count)
        this.schema.alterTable(this.propertiesTable, (table) => {
            table.index(
                ['status', 'deleted_at', 'favorites_count', 'view_count'],
                'idx_properties_sort_likes'
            )
        })

        // 🚀 Index for station filtering JOIN
        this.schema.alterTable(this.stationsTable, (table) => {
            table.index(['property_id', 'station_id'], 'idx_pts_property_station')
        })
    }

    async down() {
        this.schema.alterTable(this.propertiesTable, (table) => {
            table.dropIndex([], 'idx_properties_sort_likes')
        })

        this.schema.alterTable(this.stationsTable, (table) => {
            table.dropIndex([], 'idx_pts_property_station')
        })
    }
}
