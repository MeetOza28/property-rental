import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Inquiry from './inquiry.js'

export default class InquiryMessage extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'inquiry_id' })
    declare inquiryId: string

    @column({ columnName: 'sender_id' })
    declare senderId: string | null

    @column({ columnName: 'sender_type' })
    declare senderType: 'user' | 'agent' | 'system'

    @column()
    declare message: string

    @column()
    declare attachments: any

    @column({ columnName: 'is_read' })
    declare isRead: boolean

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => Inquiry)
    declare inquiry: BelongsTo<typeof Inquiry>
}
