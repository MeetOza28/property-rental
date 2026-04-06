import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
// import { AccessTokens } from '@adonisjs/auth/access_tokens'

export default class PasswordResetToken extends BaseModel {
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

    @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User, { foreignKey: 'userId' })
    declare user: BelongsTo<typeof User>

    static valid = scope((query) => {
        query.where('expires_at', '>', DateTime.now().toSQL())
    })

    isExpired() {
        return this.expiresAt < DateTime.now()
    }
}
