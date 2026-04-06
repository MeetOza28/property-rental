import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'add_preferred_language_to_users'

    async up() {
        this.schema.alterTable('users', (table) => {
            table.string('preferred_language').defaultTo('en')
        })
    }

    async down() {
        this.schema.alterTable('users', (table) => {
            table.dropColumn('preferred_language')
        })
    }
}
