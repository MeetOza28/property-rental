import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_reviews'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.index(['property_id'], 'property_reviews_property_idx')
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['property_id'], 'property_reviews_property_idx')
        })
    }
}
