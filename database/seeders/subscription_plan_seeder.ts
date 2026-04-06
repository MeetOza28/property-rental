import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'

export default class SubscriptionPlanSeeder {
    public async run() {
        logger.info('Seeding subscription plans...')
        const plans = [
            {
                name: 'Basic',
                description: 'List up to 5 properties per month',
                stripe_price_id: 'price_1TF55T8Ihap1cyeadrRYbNBV',
                stripe_product_id: null,
                amount: 4900,
                currency: 'usd',
                interval: 'month',
                is_active: true,
                max_properties: 5,
            },
            {
                name: 'Pro',
                description: 'List up to 10 properties per month',
                stripe_price_id: 'price_1TF5638Ihap1cyeabEN48rEi',
                stripe_product_id: null,
                amount: 9900,
                currency: 'usd',
                interval: 'month',
                is_active: true,
                max_properties: 10, // ✅ FIXED
            },
            {
                name: 'Premium',
                description: 'Unlimited properties',
                stripe_price_id: 'price_1TFBVv8Ihap1cyeaYhuhv7Ya',
                stripe_product_id: null,
                amount: 14900,
                currency: 'usd',
                interval: 'month',
                is_active: true,
                max_properties: null, // ✅ unlimited
            },
            {
                name: 'Lifetime',
                description: 'Unlimited properties forever',
                stripe_price_id: 'price_1TFBXP8Ihap1cyeasgcXcB39', // ⚠️ IMPORTANT
                stripe_product_id: null,
                amount: 49900,
                currency: 'usd',
                interval: 'lifetime', // ✅ CUSTOM
                is_active: true,
                max_properties: null, // ✅ unlimited
            },
        ]

        const now = new Date()
        for (const plan of plans) {
            const existing = await db.from('subscription_plans').where('name', plan.name).first()

            if (existing) {
                await db.from('subscription_plans').where('id', existing.id).update({
                    description: plan.description,
                    stripe_price_id: plan.stripe_price_id,
                    stripe_product_id: plan.stripe_product_id,
                    amount: plan.amount,
                    currency: plan.currency,
                    interval: plan.interval,
                    is_active: plan.is_active,
                    max_properties: plan.max_properties,
                    updated_at: now,
                })
            } else {
                await db.table('subscription_plans').insert({
                    id: randomUUID(),
                    ...plan,
                    created_at: now,
                    updated_at: now,
                })
            }
        }

        logger.info('Subscription plans seeded or updated')
    }
}
