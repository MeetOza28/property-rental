import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const TOTAL = 1_000_000
const BATCH_SIZE = 5000

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export default class BulkPropertySeeder {
    public async run() {
        logger.info('Fetching wards & users...')

        const wards = await db.from('wards').select('id')
        const users = await db.from('users').select('id')

        if (!wards.length) throw new Error('No wards found')
        if (!users.length) throw new Error('No users found')

        const wardIds = wards.map((w) => w.id)
        const userIds = users.map((u) => u.id)

        logger.info('Seeding properties...')

        for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
            const rows = []

            for (let j = 0; j < BATCH_SIZE; j++) {
                const id = randomUUID()
                const name = `Property ${i + j}`
                const slug = `property-${i + j}-${id.slice(0, 5)}`

                rows.push({
                    id,
                    name,
                    slug,
                    status: 'published',

                    rent_amount: randomInt(30000, 200000),

                    management_fee: randomInt(0, 5000),
                    security_deposit: randomInt(0, 100000),
                    guarantor_fee: randomInt(0, 20000),
                    agency_fee: randomInt(0, 20000),
                    insurence_fee: randomInt(0, 15000),
                    key_money: randomInt(0, 100000),
                    other_initial_costs: randomInt(0, 50000),

                    ward_id: randomFrom(wardIds),

                    created_by: randomFrom(userIds), // ✅ NEVER NULL

                    view_count: randomInt(0, 500),

                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            await db.table('properties').multiInsert(rows)

            logger.info(`Inserted ${i + BATCH_SIZE}`)
        }

        logger.info('Property seeding completed')
    }
}
