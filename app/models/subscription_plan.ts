import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import AgentSubscription from './agent_subscription.js'

export default class SubscriptionPlan extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare name: string

    @column()
    declare description: string | null

    @column({ columnName: 'stripe_price_id' })
    declare stripePriceId: string

    @column({ columnName: 'stripe_product_id' })
    declare stripeProductId: string | null

    @column()
    declare amount: number

    @column()
    declare currency: string

    @column()
    declare interval: string

    @column({ columnName: 'is_active' })
    declare isActive: boolean

    @column({ columnName: 'max_properties' })
    declare maxProperties: number | null

    @column.dateTime({ columnName: 'created_at', autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @hasMany(() => AgentSubscription, { foreignKey: 'planId' })
    declare subscriptions: HasMany<typeof AgentSubscription>

    @beforeCreate()
    static assignId(model: SubscriptionPlan) {
        model.id = randomUUID()
    }
}
