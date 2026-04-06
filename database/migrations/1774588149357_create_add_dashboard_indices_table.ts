import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddDashboardIndexes extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable('properties', (table) => {
            table.index(['assigned_agent_id', 'created_at'], 'idx_properties_agent_created_at')
            table.index(['created_by', 'created_at'], 'idx_properties_creator_created_at')
        })

        this.schema.alterTable('property_views', (table) => {
            table.index(['viewed_at', 'property_id'], 'idx_views_viewed_property')
        })
    }

    async down() {
        this.schema.alterTable('properties', (table) => {
            table.dropIndex(['assigned_agent_id', 'created_at'], 'idx_properties_agent_created_at')
            table.dropIndex(['created_by', 'created_at'], 'idx_properties_creator_created_at')
        })

        this.schema.alterTable('property_views', (table) => {
            table.dropIndex(['viewed_at', 'property_id'], 'idx_views_viewed_property')
        })
    }
}
