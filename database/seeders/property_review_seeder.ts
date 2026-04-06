import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const TOTAL_REVIEWS = 20000 // keep reasonable to avoid long runtimes
const BATCH_SIZE = 2000

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFrom<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomComment() {
    const samples = [
        'Great location and amenities.',
        'Quiet building, would recommend.',
        'Spacious rooms and good sunlight.',
        'Close to stations and shops.',
        'Nice view, but a bit noisy.',
    ]
    return randomFrom(samples)
}

export default class PropertyReviewSeeder {
    public async run() {
        logger.info('Fetching properties and users for reviews...')

        const properties = await db.from('properties').select('id').limit(100000)
        const users = await db.from('users').select('id').limit(50000)

        if (!properties.length) throw new Error('❌ No properties found')
        if (!users.length) throw new Error('❌ No users found')

        const propertyIds = properties.map((p) => p.id)
        const userIds = users.map((u) => u.id)

        logger.info(`Seeding ${TOTAL_REVIEWS} property reviews...`)

        for (let i = 0; i < TOTAL_REVIEWS; i += BATCH_SIZE) {
            const size = Math.min(BATCH_SIZE, TOTAL_REVIEWS - i)
            const rows = [] as any[]

            for (let j = 0; j < size; j++) {
                rows.push({
                    id: randomUUID(),
                    property_id: randomFrom(propertyIds),
                    user_id: randomFrom(userIds),
                    rating: randomInt(1, 5),
                    comment: randomComment(),
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            await db.table('property_reviews').multiInsert(rows)
            logger.info(`Inserted ${i + size}/${TOTAL_REVIEWS} reviews`)
        }

        logger.info('Property reviews seeding completed.')
    }
}
