import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.float('avg_rating').defaultTo(0)
            table.integer('reviews_count').defaultTo(0)

            // IMPORTANT for performance
            table.index(['avg_rating'])
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('avg_rating')
            table.dropColumn('reviews_count')
        })
    }
}
