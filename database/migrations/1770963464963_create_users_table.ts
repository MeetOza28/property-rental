import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'users'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.string('username').notNullable()
            table.string('email').notNullable().unique()
            table.string('password').notNullable()
            table
                .enu('role', ['admin', 'agent', 'public'], {
                    useNative: true,
                    enumName: 'user_role',
                })
                .notNullable()
                .index()
            table.boolean('is_active').defaultTo(false)
            table.timestamp('email_verified_at').nullable()
            table.string('remember_me_token').nullable()
            table.timestamp('created_at')
            table.timestamp('updated_at')
            table.timestamp('deleted_at').nullable().index()
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
