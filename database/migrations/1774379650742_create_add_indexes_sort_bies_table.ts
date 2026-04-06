import db from '@adonisjs/lucid/services/db'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    private async indexExists(indexName: string) {
        const rows = await db
            .from('information_schema.statistics')
            .whereRaw('table_schema = DATABASE()')
            .andWhere('table_name', this.tableName)
            .andWhere('index_name', indexName)
            .count('* as count')

        const count = (rows[0] as any)?.count ?? 0
        return Number(count) > 0
    }

    async up() {
        const indexes = [
            {
                name: 'properties_status_deleted_at_avg_rating_index',
                columns: ['status', 'deleted_at', 'avg_rating'] as const,
            },
            {
                name: 'properties_status_deleted_at_created_at_index',
                columns: ['status', 'deleted_at', 'created_at'] as const,
            },
            {
                name: 'properties_status_deleted_at_rent_amount_index',
                columns: ['status', 'deleted_at', 'rent_amount'] as const,
            },
            {
                name: 'properties_status_deleted_at_view_count_index',
                columns: ['status', 'deleted_at', 'view_count'] as const,
            },
        ]

        for (const { name, columns } of indexes) {
            const exists = await this.indexExists(name)
            if (!exists) {
                try {
                    await this.schema.alterTable(this.tableName, (table) => {
                        table.index(columns as unknown as string[], name)
                    })
                } catch (error: any) {
                    // If this DB was left in a partially migrated state,
                    // the index may already exist even though our metadata query
                    // didn't see it. Treat duplicate index creation as a no-op.
                    if (String(error?.message ?? error).includes('Duplicate key name')) {
                        continue
                    }
                    throw error
                }
            }
        }
    }

    async down() {
        const indexes = [
            {
                name: 'properties_status_deleted_at_avg_rating_index',
                columns: ['status', 'deleted_at', 'avg_rating'] as const,
            },
            {
                name: 'properties_status_deleted_at_created_at_index',
                columns: ['status', 'deleted_at', 'created_at'] as const,
            },
            {
                name: 'properties_status_deleted_at_rent_amount_index',
                columns: ['status', 'deleted_at', 'rent_amount'] as const,
            },
            {
                name: 'properties_status_deleted_at_view_count_index',
                columns: ['status', 'deleted_at', 'view_count'] as const,
            },
        ]

        for (const { name, columns } of indexes) {
            const exists = await this.indexExists(name)
            if (exists) {
                await this.schema.alterTable(this.tableName, (table) => {
                    table.dropIndex(columns as unknown as string[], name)
                })
            }
        }
    }
}
