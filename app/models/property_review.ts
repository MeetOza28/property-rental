import { DateTime } from 'luxon'
import {
    afterCreate,
    afterDelete,
    afterUpdate,
    BaseModel,
    belongsTo,
    column,
} from '@adonisjs/lucid/orm'
import Property from './property.js'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import db from '@adonisjs/lucid/services/db'

export default class PropertyReview extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare propertyId: string

    @column()
    declare userId: string

    @column()
    declare rating: number

    @column()
    declare comment: string | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => Property)
    declare property: BelongsTo<typeof Property>

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    static async updatePropertyRating(propertyId: string) {
        await db.rawQuery(
            `
      UPDATE properties p
      SET
        avg_rating = (
          SELECT COALESCE(ROUND(AVG(rating)), 0)
          FROM property_reviews
          WHERE property_id = ?
        ),
        reviews_count = (
          SELECT COUNT(*)
          FROM property_reviews
          WHERE property_id = ?
        )
      WHERE p.id = ?
    `,
            [propertyId, propertyId, propertyId]
        )
    }

    // 🔥 HOOKS
    @afterCreate()
    static async afterCreateHook(review: PropertyReview) {
        await this.updatePropertyRating(review.propertyId)
    }

    @afterUpdate()
    static async afterUpdateHook(review: PropertyReview) {
        await this.updatePropertyRating(review.propertyId)
    }

    @afterDelete()
    static async afterDeleteHook(review: PropertyReview) {
        await this.updatePropertyRating(review.propertyId)
    }
}
