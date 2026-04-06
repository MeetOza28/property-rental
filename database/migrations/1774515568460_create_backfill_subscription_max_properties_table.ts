import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'subscription_plans'

    async up() {
        // Set limits for existing plans
        await this.db.from(this.tableName).where('name', 'Basic').update({ max_properties: 5 })
        await this.db.from(this.tableName).where('name', 'Pro').update({ max_properties: null })
    }

    async down() {
        await this.db.from(this.tableName).whereIn('name', ['Basic', 'Pro']).update({
            max_properties: null,
        })
    }
}
