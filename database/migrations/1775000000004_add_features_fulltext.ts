import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        const hasColumn = await this.schema.hasColumn(this.tableName, 'features_text')

        if (!hasColumn) {
            await this.schema.alterTable(this.tableName, (table) => {
                table.text('features_text').nullable()
                table.index(['features_text'], 'properties_features_text_idx', 'FULLTEXT')
            })
        } else {
            const [rows] = await this.db.rawQuery(
                `SELECT COUNT(1) AS count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
                [this.tableName, 'properties_features_text_idx']
            )

            const hasIndex = Array.isArray(rows) && Number(rows[0]?.count) > 0

            if (!hasIndex) {
                await this.schema.alterTable(this.tableName, (table) => {
                    table.index(['features_text'], 'properties_features_text_idx', 'FULLTEXT')
                })
            }
        }

        // Backfill features_text from existing features JSON
        await this.db.rawQuery(
            `UPDATE properties SET features_text = JSON_UNQUOTE(JSON_EXTRACT(features, '$'))`
        )
    }

    public async down() {
        const hasColumn = await this.schema.hasColumn(this.tableName, 'features_text')

        if (hasColumn) {
            await this.schema.alterTable(this.tableName, (table) => {
                table.dropIndex('features_text', 'properties_features_text_idx')
                table.dropColumn('features_text')
            })
        }
    }
}
