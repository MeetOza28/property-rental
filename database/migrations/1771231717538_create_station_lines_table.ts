import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'station_lines'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('station_id').references('id').inTable('train_stations').onDelete('CASCADE')
            table.uuid('line_id').references('id').inTable('train_lines').onDelete('CASCADE')
            table.unique(['station_id', 'line_id'])
            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
