import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddGeoSuperIndex extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'deleted_at', 'latitude', 'longitude', 'rent_amount'],
                'idx_geo_super'
            )
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'deleted_at', 'latitude', 'longitude', 'rent_amount'],
                'idx_geo_super'
            )
        })
    }
}
