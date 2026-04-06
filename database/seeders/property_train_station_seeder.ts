import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const BATCH_SIZE = 5000
const MAX_PROPERTIES = 50000 // cap to avoid endless batches when properties table is huge
const CLEAN_BEFORE_SEED = true

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomSubset<T>(arr: T[], maxItems = 3): T[] {
    const size = randomInt(1, Math.min(maxItems, arr.length))
    const copy = [...arr]
    const result: T[] = []

    for (let i = 0; i < size; i++) {
        const index = Math.floor(Math.random() * copy.length)
        result.push(copy.splice(index, 1)[0])
    }

    return result
}

export default class PropertyTrainStationSeeder {
    public async run() {
        logger.info('Seeding property_train_stations...')

        if (CLEAN_BEFORE_SEED) {
            logger.info('Cleaning property_train_stations...')
            await db.rawQuery('SET FOREIGN_KEY_CHECKS = 0')
            await db.rawQuery('TRUNCATE TABLE property_train_stations')
            await db.rawQuery('SET FOREIGN_KEY_CHECKS = 1')
        }

        const properties = await db
            .from('properties')
            .select('id')
            .whereNull('deleted_at')
            .where('status', 'published')
            .limit(MAX_PROPERTIES)
        const stations = await db.from('train_stations').select('id')

        if (!properties.length) throw new Error('❌ No properties found')
        if (!stations.length) throw new Error('❌ No stations found')

        const propertyIds = properties.map((p) => p.id)
        const stationIds = stations.map((s) => s.id)

        logger.info(
            `Using up to ${properties.length} properties (cap ${MAX_PROPERTIES}) and ${stations.length} stations`
        )

        const rows: any[] = []
        const used = new Set<string>()

        for (const propertyId of propertyIds) {
            // assign 1–3 stations per property
            const assignedStations = randomSubset(stationIds, 3)

            for (const stationId of assignedStations) {
                const key = `${propertyId}-${stationId}`
                if (used.has(key)) continue

                used.add(key)

                rows.push({
                    id: randomUUID(),
                    property_id: propertyId,
                    station_id: stationId,
                    walking_minutes: randomInt(1, 20),
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            // batch insert
            if (rows.length >= BATCH_SIZE) {
                await db.table('property_train_stations').multiInsert(rows)
                logger.info(`Inserted ${rows.length} mappings`)
                rows.length = 0
            }
        }

        // insert remaining
        if (rows.length > 0) {
            await db.table('property_train_stations').multiInsert(rows)
            logger.info(`Inserted ${rows.length} mappings`)
        }

        logger.info('✅ property_train_stations seeding completed')
    }
}
