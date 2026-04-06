import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import SubscriptionPlan from './subscription_plan.js'

export type SubscriptionStatus =
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'lifetime'

export default class AgentSubscription extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string

    @column({ columnName: 'plan_id' })
    declare planId: string | null

    @column({ columnName: 'stripe_customer_id' })
    declare stripeCustomerId: string | null

    @column({ columnName: 'stripe_subscription_id' })
    declare stripeSubscriptionId: string | null

    @column()
    declare status: SubscriptionStatus

    @column.dateTime({ columnName: 'current_period_start' })
    declare currentPeriodStart: DateTime | null

    @column.dateTime({ columnName: 'current_period_end' })
    declare currentPeriodEnd: DateTime | null

    @column.dateTime({ columnName: 'cancel_at' })
    declare cancelAt: DateTime | null

    @column({ columnName: 'cancel_at_period_end' })
    declare cancelAtPeriodEnd: boolean

    @column.dateTime({ columnName: 'canceled_at' })
    declare canceledAt: DateTime | null

    @column.dateTime({ columnName: 'ended_at' })
    declare endedAt: DateTime | null

    @column({
        prepare: (value: any) => (value ? JSON.stringify(value) : null),
        consume: (value: any) => {
            if (!value) return null
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value)
                } catch (error) {
                    return null
                }
            }
            return value
        },
    })
    declare metadata: Record<string, any> | null

    @column.dateTime({ columnName: 'created_at', autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User, { foreignKey: 'userId' })
    declare user: BelongsTo<typeof User>

    @belongsTo(() => SubscriptionPlan, { foreignKey: 'planId' })
    declare plan: BelongsTo<typeof SubscriptionPlan>

    @beforeCreate()
    static assignId(model: AgentSubscription) {
        model.id = randomUUID()
    }

    @computed()
    get isActive() {
        return this.status === 'active' || this.status === 'trialing' || this.status === 'lifetime'
    }
}
