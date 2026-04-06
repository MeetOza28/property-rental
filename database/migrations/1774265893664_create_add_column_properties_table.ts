import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('inquiry_count').defaultTo(0)
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('inquiry_count')
        })
    }
}
