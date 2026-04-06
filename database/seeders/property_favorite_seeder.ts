import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const TOTAL = 100

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export default class PropertyFavoriteSeeder {
    public async run() {
        logger.info('Seeding property favorites...')

        const users = await db.from('users').select('id')
        const properties = await db.from('properties').select('id')

        if (!users.length) throw new Error('❌ No users found')
        if (!properties.length) throw new Error('❌ No properties found')

        const userIds = users.map((u) => u.id)
        const propertyIds = properties.map((p) => p.id)

        const rows = []
        const used = new Set() // avoid duplicate (user_id + property_id)

        while (rows.length < TOTAL) {
            const userId = randomFrom(userIds)
            const propertyId = randomFrom(propertyIds)

            const key = `${userId}-${propertyId}`

            if (used.has(key)) continue

            used.add(key)

            rows.push({
                id: randomUUID(),
                user_id: userId,
                property_id: propertyId,
                created_at: new Date(),
                updated_at: new Date(),
            })
        }

        await db.table('property_favorites').multiInsert(rows)

        logger.info(`Inserted ${rows.length} property favorites`)
    }
}
