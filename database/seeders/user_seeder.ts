import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

export default class UserSeeder {
    public async run() {
        logger.info('Seeding users...')

        const rows = []

        // ✅ Admin (required)
        rows.push({
            id: randomUUID(),
            username: 'admin',
            email: 'admin@test.com',
            password: 'dummyhash', // replace with hashed if needed
            role: 'admin',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        })

        // ✅ Agents
        for (let i = 1; i <= 10; i++) {
            rows.push({
                id: randomUUID(),
                username: `agent${i}`,
                email: `agent${i}@test.com`,
                password: 'dummyhash',
                role: 'agent',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            })
        }

        // ✅ Public Users
        for (let i = 1; i <= 50; i++) {
            rows.push({
                id: randomUUID(),
                username: `user${i}`,
                email: `user${i}@test.com`,
                password: 'dummyhash',
                role: 'public',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            })
        }

        await db.table('users').multiInsert(rows)

        logger.info(`Inserted ${rows.length} users`)
    }
}
