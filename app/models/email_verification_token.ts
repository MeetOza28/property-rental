import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class EmailVerificationToken extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string

    @column()
    declare token: string

    @column.dateTime({ columnName: 'expires_at' })
    declare expiresAt: DateTime

    @column.dateTime({ columnName: 'created_at', autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    static valid = scope((query) => {
        query.where('expires_at', '>', DateTime.now().toSQL())
    })
}
