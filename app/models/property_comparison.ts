import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class PropertyComparison extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string | null

    @column({ columnName: 'session_id' })
    declare sessionId: string | null

    @column({
        columnName: 'property_ids',
        prepare: (value) => JSON.stringify(value),
        consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
    })
    declare propertyIds: string[]

    @column.dateTime({
        columnName: 'expires_at',
        autoCreate: false,
        autoUpdate: false,
    })
    declare expiresAt: DateTime | null

    @column.dateTime({
        columnName: 'created_at',
        autoCreate: true,
    })
    declare createdAt: DateTime

    @column.dateTime({
        columnName: 'updated_at',
        autoCreate: true,
        autoUpdate: true,
    })
    declare updatedAt: DateTime
}
