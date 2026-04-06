import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'
    protected stationTable = 'property_train_stations'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'deleted_at', 'ward_id', 'structure', 'bed_rooms', 'rent_amount'],
                'properties_filter_bedrooms_idx'
            )
        })

        this.schema.alterTable(this.stationTable, (table) => {
            table.index(['station_id', 'property_id'], 'property_stations_station_property_idx')
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'deleted_at', 'ward_id', 'structure', 'bed_rooms', 'rent_amount'],
                'properties_filter_bedrooms_idx'
            )
        })

        this.schema.alterTable(this.stationTable, (table) => {
            table.dropIndex(['station_id', 'property_id'], 'property_stations_station_property_idx')
        })
    }
}
