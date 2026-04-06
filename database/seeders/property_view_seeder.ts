import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

const TOTAL = 200 // keep small for testing

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomIP() {
    return `192.168.1.${Math.floor(Math.random() * 255)}`
}

export default class PropertyViewSeeder {
    public async run() {
        logger.info('Seeding property views...')

        const users = await db.from('users').select('id')
        const properties = await db.from('properties').select('id')

        if (!users.length) throw new Error('❌ No users found')
        if (!properties.length) throw new Error('❌ No properties found')

        const userIds = users.map((u) => u.id)
        const propertyIds = properties.map((p) => p.id)

        const rows = []

        for (let i = 0; i < TOTAL; i++) {
            const isLoggedIn = Math.random() > 0.3 // 70% logged-in users

            rows.push({
                id: randomUUID(),
                property_id: randomFrom(propertyIds),
                user_id: isLoggedIn ? randomFrom(userIds) : null,
                session_id: !isLoggedIn ? randomUUID() : null,
                ip_address: randomIP(),
                user_agent: 'Seeder-Agent',
                viewed_at: DateTime.now()
                    .minus({ days: Math.floor(Math.random() * 10) })
                    .toJSDate(),
                created_at: new Date(),
                updated_at: new Date(),
            })
        }

        await db.table('property_views').multiInsert(rows)

        logger.info(`Inserted ${rows.length} property views`)
    }
}
