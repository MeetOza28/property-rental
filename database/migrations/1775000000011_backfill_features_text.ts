import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BackfillFeaturesText extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        // Ensure the FULLTEXT index on features_text exists
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

        // Backfill features_text from features for rows where features_text is NULL
        await this.db.rawQuery(
            `UPDATE properties SET features_text = JSON_UNQUOTE(JSON_EXTRACT(features, '$')) WHERE features IS NOT NULL AND features_text IS NULL`
        )
    }

    public async down() {
        // No rollback: we keep the index and the backfilled data
    }
}
