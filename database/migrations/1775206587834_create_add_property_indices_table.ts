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
        const normalIndexes = [
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
            {
                name: 'idx_published_filters',
                columns: ['deleted_at', 'status', 'bed_rooms', 'rent_amount', 'size_sqm'],
            },
            {
                name: 'idx_bed_rooms',
                columns: ['bed_rooms'],
            },
            {
                name: 'idx_size_sqm',
                columns: ['size_sqm'],
            },
            {
                name: 'idx_rent_amount',
                columns: ['rent_amount'],
            },
            {
                name: 'idx_status',
                columns: ['status'],
            },
            {
                name: 'idx_deleted_at',
                columns: ['deleted_at'],
            },
        ]

        // ✅ NORMAL INDEXES
        for (const index of normalIndexes) {
            const exists = await this.indexExists(index.name)

            if (!exists) {
                try {
                    await this.schema.alterTable(this.tableName, (table) => {
                        table.index(index.columns, index.name)
                    })
                } catch (error: any) {
                    if (
                        String(error?.message ?? error).includes('Duplicate key name') ||
                        String(error?.code ?? '') === 'ER_DUP_KEYNAME'
                    ) {
                        continue
                    }
                    throw error
                }
            }
        }

        // ✅ FULLTEXT INDEX (special handling)
        const fullTextExists = await this.indexExists('idx_features_fulltext')

        if (!fullTextExists) {
            try {
                await db.rawQuery(`
          CREATE FULLTEXT INDEX idx_features_fulltext
          ON ${this.tableName} (features_text)
        `)
            } catch (error: any) {
                if (String(error?.message ?? error).includes('Duplicate key name')) {
                    return
                }
                throw error
            }
        }

        // ✅ Update stats
        await db.rawQuery(`ANALYZE TABLE ${this.tableName}`)
    }

    async down() {
        const indexes = [
            'lat_lng_idx',
            'idx_properties_geo_filter',
            'idx_properties_geo_covering',
            'idx_published_filters',
            'idx_bed_rooms',
            'idx_size_sqm',
            'idx_rent_amount',
            'idx_status',
            'idx_deleted_at',
        ]

        for (const indexName of indexes) {
            const exists = await this.indexExists(indexName)

            if (exists) {
                await this.schema.alterTable(this.tableName, (table) => {
                    table.dropIndex([], indexName)
                })
            }
        }

        // FULLTEXT DROP
        const fullTextExists = await this.indexExists('idx_features_fulltext')

        if (fullTextExists) {
            await db.rawQuery(`
        DROP INDEX idx_features_fulltext ON ${this.tableName}
      `)
        }
    }
}
