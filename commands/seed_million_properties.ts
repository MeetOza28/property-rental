import Database from '@adonisjs/lucid/services/db'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace' // Add this import
import { randomUUID } from 'node:crypto'

export default class SeedMillionProperties extends BaseCommand {
    static commandName = 'seed:million-properties'
    static description = 'Insert 1M properties for performance testing'

    // Add this block to boot the app and initialize the Database service
    static options: CommandOptions = {
        startApp: true,
    }

    async run() {
        const total = 1_000_000
        const batchSize = 5000

        const wardId = '2f4b6c8e-1234-5678-9012-abcdefabcdef'
        const createdBy = 'd94594dd-49c3-4838-b3f5-da2f10ac9add'

        this.logger.info('Starting 1M seed process...')
        const startedAt = Date.now()

        for (let i = 0; i < total; i += batchSize) {
            const rows = []

            this.logger.info(`Generating UUIDs and data for batch ${i}...`)
            for (let j = 0; j < batchSize && i + j < total; j++) {
                rows.push({
                    id: randomUUID(),
                    name: `Property ${i + j}`,
                    slug: `property-${i + j}`,
                    status: 'published',
                    rent_amount: Math.floor(Math.random() * 80000) + 5000,
                    ward_id: wardId,
                    created_by: createdBy,
                    view_count: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }
            this.logger.info('Attempting to insert into database...')

            await Database.table('properties').multiInsert(rows)

            this.logger.info(`Inserted: ${Math.min(i + batchSize, total)}`)
        }

        this.logger.info(`SEED_1M completed in ${Date.now() - startedAt}ms`)
    }
}
