import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'auth_access_tokens'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.boolean('is_revoked').notNullable().defaultTo(false)
            table.index(['is_revoked'])
            table.index(['expires_at'])
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('is_revoked')
        })
    }
}
