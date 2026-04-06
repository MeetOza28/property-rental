import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'agent_subscriptions'

    async up() {
        // Ensure the status enum can store lifetime subscriptions
        await this.schema.raw(`
            ALTER TABLE ${this.tableName}
            MODIFY status ENUM(
                'active',
                'trialing',
                'past_due',
                'canceled',
                'unpaid',
                'incomplete',
                'incomplete_expired',
                'lifetime'
            ) NOT NULL DEFAULT 'incomplete'
        `)
    }

    async down() {
        // Revert to the previous enum definition (removes lifetime)
        await this.schema.raw(`
            ALTER TABLE ${this.tableName}
            MODIFY status ENUM(
                'active',
                'trialing',
                'past_due',
                'canceled',
                'unpaid',
                'incomplete',
                'incomplete_expired'
            ) NOT NULL DEFAULT 'incomplete'
        `)
    }
}
