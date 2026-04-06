import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddFavoritesCountToProperties extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('favorites_count').defaultTo(0)
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('favorites_count')
        })
    }
}
