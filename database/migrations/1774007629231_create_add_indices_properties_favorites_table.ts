import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_favorites'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(['user_id', 'property_id'])
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['user_id', 'property_id'])
        })
    }
}
