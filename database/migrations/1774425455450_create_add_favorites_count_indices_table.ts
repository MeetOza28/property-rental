import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddFavoritesCountIndex extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(
                ['status', 'deleted_at', 'favorites_count'],
                'idx_properties_status_deleted_favorites'
            )
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(
                ['status', 'deleted_at', 'favorites_count'],
                'idx_properties_status_deleted_favorites'
            )
        })
    }
}
