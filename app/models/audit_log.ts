import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'

export default class AuditLog extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string | null

    @column()
    declare action: string

    @column({ columnName: 'entity_type' })
    declare entityType: string

    @column({ columnName: 'entity_id' })
    declare entityId: string | null

    @column({ prepare: (value) => JSON.stringify(value), consume: (value) => JSON.parse(value) })
    declare oldValues: string | null

    @column({ prepare: (value) => JSON.stringify(value), consume: (value) => JSON.parse(value) })
    declare newValues: string | null

    @column({ columnName: 'ip_address' })
    declare ipAddress: string | null

    @column({ columnName: 'user_agent' })
    declare userAgent: string | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    @beforeCreate()
    static assignId(model: AuditLog) {
        model.id = randomUUID()
    }
}
