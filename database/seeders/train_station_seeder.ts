import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const STATION_COUNT = 1000 // Minimum guaranteed

function randomCoordinate(min: number, max: number) {
    return Math.random() * (max - min) + min
}

export default class TrainStationSeeder {
    public async run() {
        logger.info(`Seeding ${STATION_COUNT} train stations...`)

        const stations: any[] = []

        for (let i = 0; i < STATION_COUNT; i++) {
            stations.push({
                id: randomUUID(),
                name: `Station ${i + 1}`,
                latitude: randomCoordinate(35.5, 35.9),
                longitude: randomCoordinate(139.5, 139.9),
                created_at: new Date(),
                updated_at: new Date(),
            })
        }

        await db.table('train_stations').multiInsert(stations)

        logger.info('Train stations seeding completed')
    }
}
