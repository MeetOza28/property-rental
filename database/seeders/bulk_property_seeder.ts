import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

const TOTAL = 1_000_000 // change anytime
const BATCH_SIZE = 5000 // safe for MySQL

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 6) {
    const factor = 10 ** decimals
    return Math.round((Math.random() * (max - min) + min) * factor) / factor
}

function randomFrom<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomSubset<T>(arr: readonly T[], maxItems = 3): T[] {
    const size = randomInt(0, Math.min(maxItems, arr.length))
    const copy = [...arr]
    const result: T[] = []
    for (let i = 0; i < size; i++) {
        const idx = randomInt(0, copy.length - 1)
        result.push(copy.splice(idx, 1)[0])
    }
    return result
}

function randomBuildDate() {
    const currentYear = new Date().getFullYear()
    const year = randomInt(currentYear - 40, currentYear)
    const month = randomInt(0, 11)
    const day = randomInt(1, 28)
    return new Date(year, month, day)
}

export default class BulkPropertySeeder {
    public async run() {
        logger.info('Fetching wards & users...')

        const wards = await db.from('wards').select('id')
        const users = await db.from('users').select('id', 'role')

        if (!wards.length) throw new Error('❌ No wards found')
        if (!users.length) throw new Error('❌ No users found')

        const wardIds = wards.map((w) => w.id)
        const userIds = users.map((u) => u.id)
        const agentIds = users.filter((u) => u.role === 'agent').map((u) => u.id)

        const layouts = ['1K', '1DK', '1LDK', '2K', '2DK', '2LDK', '3LDK']
        const structures = ['apartment', 'mansion', 'house'] as const
        const featurePool = [
            'balcony',
            'parking',
            'pet_friendly',
            'elevator',
            'auto_lock',
            'delivery_box',
            'air_conditioner',
            'floor_heating',
            'system_kitchen',
            // Added amenities from UI
            'bicycle_parking',
            'car_parking',
            'pet_allowed',
            'roof_balcony',
            'south_facing',
        ]

        // ✅ Defensive UUID validation (VERY important)
        for (const id of userIds) {
            if (typeof id !== 'string' || id.length !== 36) {
                throw new Error(`❌ Invalid user UUID detected: ${id}`)
            }
        }

        logger.info('Seeding properties...')

        for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
            const rows = []
            const size = Math.min(BATCH_SIZE, TOTAL - i)

            for (let j = 0; j < size; j++) {
                const id = randomUUID()
                const index = i + j
                const buildDate = randomBuildDate()
                const age = new Date().getFullYear() - buildDate.getFullYear()
                const structure = randomFrom(structures)
                const layout = randomFrom(layouts)

                rows.push({
                    id,
                    name: `Property ${index}`,
                    slug: `property-${index}-${id.slice(0, 6)}`, // ✅ Always unique

                    status: 'published',

                    address: `Address ${index}, Ward ${randomFrom(wardIds).slice(0, 4)}`,
                    description: `Spacious ${layout} ${structure} with great access to transit.`,

                    latitude: randomFloat(35, 36),
                    longitude: randomFloat(139, 140),
                    layout,
                    bed_rooms: randomInt(0, 5),
                    room_number: `${randomInt(1, 20)}0${randomInt(1, 9)}`,
                    size_sqm: randomInt(15, 200),
                    build_date: buildDate,
                    age,
                    floor: randomInt(1, 20),
                    structure,

                    feature_image: `https://picsum.photos/seed/${id}/800/600`,
                    other_images: JSON.stringify([
                        `https://picsum.photos/seed/${id}-1/800/600`,
                        `https://picsum.photos/seed/${id}-2/800/600`,
                    ]),

                    features: JSON.stringify(randomSubset(featurePool, 4)),

                    rent_amount: randomInt(30000, 200000),

                    management_fee: randomInt(0, 5000),
                    security_deposit: randomInt(0, 100000),
                    guarantor_fee: randomInt(0, 20000),
                    agency_fee: randomInt(0, 20000),
                    insurence_fee: randomInt(0, 15000),
                    key_money: randomInt(0, 100000),
                    other_initial_costs: randomInt(0, 50000),

                    ward_id: randomFrom(wardIds),

                    assigned_agent_id: randomFrom(agentIds),
                    created_by: randomFrom(userIds), // ✅ FK safe

                    guarantor_company: 'ACME Guarantee Co.',
                    fire_insurence: 'Standard Fire Plan',

                    view_count: randomInt(0, 500),

                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            await db.table('properties').multiInsert(rows)

            logger.info(`Inserted ${i + size}`)
        }

        logger.info('Property seeding completed')
    }
}
