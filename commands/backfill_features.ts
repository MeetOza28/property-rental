import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class BackfillFeatures extends BaseCommand {
    static commandName = 'backfill:features'
    static description = 'Backfill features_text for fulltext search'

    static options: CommandOptions = {
        startApp: true,
    }

    async run() {
        this.logger.info('Updating features_text...')

        await db.rawQuery(`
      UPDATE properties
      SET features_text = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(JSON_UNQUOTE(JSON_EXTRACT(features, '$')), '[', ''),
          ']', ''),
        '"', ''),
      ',', ' ')
      WHERE features IS NOT NULL
    `)

        this.logger.success('features_text updated successfully!')
    }
}
