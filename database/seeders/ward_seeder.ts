import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const WARD_COUNT = 75 // Minimum guaranteed

export default class WardSeeder {
    public async run() {
        logger.info(`Seeding ${WARD_COUNT} wards...`)

        const wards: any[] = []

        for (let i = 0; i < WARD_COUNT; i++) {
            wards.push({
                id: randomUUID(),
                name: `Ward ${i + 1}`,
                prefecture: `Prefecture ${Math.floor(i / 5) + 1}`,
                districts: JSON.stringify([
                    `District ${i}-A`,
                    `District ${i}-B`,
                    `District ${i}-C`,
                ]),
                created_at: new Date(),
                updated_at: new Date(),
            })
        }

        await db.table('wards').multiInsert(wards)

        logger.info('Wards seeding completed')
    }
}
