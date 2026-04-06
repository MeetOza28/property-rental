import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { AccessToken } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Property from './property.js'
import { randomUUID } from 'node:crypto'
import PropertyFavorite from './property_favorite.js'
import AgentSubscription from './agent_subscription.js'
// import { compose } from '@adonisjs/core/helpers'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
    uids: ['email'],
    passwordColumnName: 'password',
})
export default class User extends AuthFinder(BaseModel) {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare username: string

    @column()
    declare email: string

    @column({ serializeAs: null })
    declare password: string

    @column()
    declare role: 'admin' | 'agent' | 'public'

    @column({ columnName: 'is_active', consume: (value) => Boolean(value) })
    declare isActive: boolean

    @column.dateTime({ columnName: 'email_verified_at' })
    declare emailVerifiedAt: DateTime | null

    @column({ columnName: 'remember_me_token' })
    declare rememberMeToken: string | null

    @column({ columnName: 'stripe_customer_id' })
    declare stripeCustomerId: string | null

    @column.dateTime({ columnName: 'deleted_at' })
    declare deletedAt: DateTime | null

    @column.dateTime({ columnName: 'created_at', autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @column()
    declare preferredLanguage: string

    declare currentAccessToken?: AccessToken
    static accessTokens = DbAccessTokensProvider.forModel(User, {
        type: 'access_token',
        prefix: 'at_',
        expiresIn: 60 * 15,
    })

    static refreshTokens = DbAccessTokensProvider.forModel(User, {
        type: 'refresh_token',
        prefix: 'rft_',
        expiresIn: 60 * 60 * 24 * 7,
    })

    @hasMany(() => Property, { foreignKey: 'createdBy' })
    declare createdProperties: HasMany<typeof Property>

    @hasMany(() => Property, { foreignKey: 'assignedAgentId' })
    declare assignedProperties: HasMany<typeof Property>

    @hasMany(() => PropertyFavorite, { foreignKey: 'userId' })
    declare favorites: HasMany<typeof PropertyFavorite>

    @hasOne(() => AgentSubscription, { foreignKey: 'userId' })
    declare subscription?: HasOne<typeof AgentSubscription>

    @beforeCreate()
    static assignId(model: User) {
        model.id = randomUUID()
    }

    async softDelete() {
        this.deletedAt = DateTime.now()
        await this.save()
    }

    async restore() {
        this.deletedAt = null
        await this.save()
    }
}
