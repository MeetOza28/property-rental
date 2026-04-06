import { DateTime } from 'luxon'
import {
    afterCreate,
    afterDelete,
    BaseModel,
    beforeCreate,
    belongsTo,
    column,
} from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Property from './property.js'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

export default class PropertyFavorite extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string

    @column({ columnName: 'property_id' })
    declare propertyId: string

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    @belongsTo(() => Property)
    declare property: BelongsTo<typeof Property>

    static async isFavorited(userId: string, propertyId: string) {
        const record = await this.query()
            .where('user_id', userId)
            .where('property_id', propertyId)
            .first()

        return !!record
    }

    static async updateFavoritesCount(propertyId: string) {
        await db.rawQuery(
            `
      UPDATE properties p
      SET favorites_count = (
        SELECT COUNT(*)
        FROM property_favorites
        WHERE property_id = ?
      )
      WHERE p.id = ?
      `,
            [propertyId, propertyId]
        )
    }

    @afterCreate()
    static async afterCreateHook(fav: PropertyFavorite) {
        await this.updateFavoritesCount(fav.propertyId)
    }

    @afterDelete()
    static async afterDeleteHook(fav: PropertyFavorite) {
        await this.updateFavoritesCount(fav.propertyId)
    }

    @beforeCreate()
    static assignId(model: PropertyFavorite) {
        model.id = randomUUID()
    }
}
