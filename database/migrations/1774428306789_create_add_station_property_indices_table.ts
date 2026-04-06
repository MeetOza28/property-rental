import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddStationPropertyIndex extends BaseSchema {
    protected tableName = 'property_train_stations'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(['station_id', 'property_id'], 'idx_pts_station_property')
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex([], 'idx_pts_station_property')
        })
    }
}
