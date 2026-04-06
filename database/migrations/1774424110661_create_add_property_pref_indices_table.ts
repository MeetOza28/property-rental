import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddPropertyPerfIndexes extends BaseSchema {
    protected propertiesTable = 'properties'
    protected favoritesTable = 'property_favorites'
    protected stationsTable = 'property_train_stations'

    async up() {
        // Indexes to speed up filters and likes_desc sort
        this.schema.alterTable(this.favoritesTable, (table) => {
            table.index(['property_id'], 'pf_property_id_idx')
        })

        this.schema.alterTable(this.stationsTable, (table) => {
            table.index(['station_id', 'property_id'], 'pts_station_property_idx')
        })

        // For features full-text search if not already present
        this.schema.alterTable(this.propertiesTable, (table) => {
            table.index(
                ['status', 'deleted_at', 'avg_rating'],
                'properties_status_deleted_at_avg_rating_idx'
            )
        })
    }

    async down() {
        this.schema.alterTable(this.favoritesTable, (table) => {
            table.dropIndex([], 'pf_property_id_idx')
        })

        this.schema.alterTable(this.stationsTable, (table) => {
            table.dropIndex([], 'pts_station_property_idx')
        })

        this.schema.alterTable(this.propertiesTable, (table) => {
            table.dropIndex([], 'properties_status_deleted_at_avg_rating_idx')
        })
    }
}
