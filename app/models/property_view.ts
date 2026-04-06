import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import Property from './property.js'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'

export default class PropertyView extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'property_id' })
    declare propertyId: string

    @column({ columnName: 'user_id' })
    declare userId: string | null

    @column({ columnName: 'session_id' })
    declare sessionId: string | null

    @column({ columnName: 'ip_address' })
    declare ipAddress: string | null

    @column({ columnName: 'user_agent' })
    declare userAgent: string | null

    @column.dateTime({ columnName: 'viewed_at' })
    declare viewedAt: DateTime

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => Property)
    declare property: BelongsTo<typeof Property>

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    static recent = scope((query, days: number) => {
        query.where('viewed_at', '>', DateTime.now().minus({ days }).toSQL())
    })

    static async recordView(propertyId: string, ctx: any) {
        return this.create({
            id: randomUUID(),
            propertyId,
            userId: ctx.auth?.user?.id ?? null,
            sessionId: ctx.session?.sessionId ?? null,
            ipAddress: ctx.request.ip(),
            userAgent: ctx.request.header('user-agent'),
            viewedAt: DateTime.now(),
        })
    }

    @beforeCreate()
    static assignId(model: PropertyView) {
        model.id = randomUUID()
    }
}
