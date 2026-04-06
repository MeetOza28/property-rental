import db from '@adonisjs/lucid/services/db'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    private async indexExists(indexName: string) {
        const result = await db.rawQuery(
            `
            SELECT COUNT(1) as count
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
            AND table_name = ?
            AND index_name = ?
            `,
            [this.tableName, indexName]
        )

        return Number(result[0][0]?.count ?? 0) > 0
    }

    async up() {
        const indexes = [
            {
                name: 'lat_lng_idx',
                columns: ['latitude', 'longitude'],
            },
            {
                name: 'idx_properties_geo_filter',
                columns: ['status', 'deleted_at', 'latitude', 'longitude'],
            },
            {
                name: 'idx_properties_geo_covering',
                columns: ['status', 'deleted_at', 'latitude', 'longitude', 'created_at'],
            },
        ]

        for (const index of indexes) {
            const exists = await this.indexExists(index.name)

            if (!exists) {
                try {
                    await this.schema.alterTable(this.tableName, (table) => {
                        table.index(index.columns, index.name)
                    })
                } catch (error: any) {
                    // Same idea as other index migrations: allow local test DBs
                    // that were left mid-migration to recover.
                    if (String(error?.message ?? error).includes('Duplicate key name')) {
                        continue
                    }
                    throw error
                }
            }
        }
    }

    async down() {
        const indexes = ['lat_lng_idx', 'idx_properties_geo_filter', 'idx_properties_geo_covering']

        for (const indexName of indexes) {
            const exists = await this.indexExists(indexName)

            if (exists) {
                await this.schema.alterTable(this.tableName, (table) => {
                    table.dropIndex([], indexName)
                })
            }
        }
    }
}
