import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class BackfillRatings extends BaseCommand {
    static commandName = 'backfill:ratings'
    static description = 'Backfill avg_rating & reviews_count'
    static options: CommandOptions = {
        startApp: true,
    }

    async run() {
        this.logger.info('Updating ratings...')

        await db.rawQuery(`
      UPDATE properties p
      LEFT JOIN (
        SELECT property_id,
               AVG(rating) as avg_rating,
               COUNT(*) as reviews_count
        FROM property_reviews
        GROUP BY property_id
      ) r ON r.property_id = p.id
      SET
        p.avg_rating = COALESCE(r.avg_rating, 0),
        p.reviews_count = COALESCE(r.reviews_count, 0)
    `)

        this.logger.success('Ratings updated successfully!')
    }
}
