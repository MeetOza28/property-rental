import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'property_train_stations'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('property_id').references('id').inTable('properties').onDelete('CASCADE')
            table.uuid('station_id').references('id').inTable('train_stations').onDelete('CASCADE')
            table.integer('walking_minutes').nullable()
            table.unique(['property_id', 'station_id'])
            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
