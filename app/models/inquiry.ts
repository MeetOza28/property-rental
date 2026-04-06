import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Property from './property.js'
import User from './user.js'
import InquiryMessage from './inquiry_message.js'

export default class Inquiry extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'property_id' })
    declare propertyId: string

    @column({ columnName: 'user_id' })
    declare userId: string | null

    @column({ columnName: 'assigned_to' })
    declare assignedTo: string | null

    @column()
    declare name: string

    @column()
    declare email: string

    @column()
    declare phone: string | null

    @column()
    declare message: string

    @column.dateTime({ columnName: 'preferred_viewing_date' })
    declare preferredViewingDate: DateTime | null

    @column()
    declare status: 'pending' | 'in_progress' | 'responded' | 'closed' | 'spam'

    @column({ columnName: 'internal_notes' })
    declare internalNotes: string | null

    @column.dateTime({ columnName: 'responded_at' })
    declare respondedAt: DateTime | null

    @column({ columnName: 'ip_address' })
    declare ipAddress: string

    @column({ columnName: 'user_agent' })
    declare userAgent: string

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => Property)
    declare property: BelongsTo<typeof Property>

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'assignedTo' })
    declare assignedAgent: BelongsTo<typeof User>

    @hasMany(() => InquiryMessage)
    declare messages: HasMany<typeof InquiryMessage>
}
