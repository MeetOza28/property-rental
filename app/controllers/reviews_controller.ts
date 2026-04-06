import Property from '#models/property'
import PropertyReview from '#models/property_review'
import { FormatService } from '#services/format_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { randomUUID } from 'node:crypto'

export default class ReviewsController {
    async index({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )

        const reviews = await PropertyReview.query()
            .where('property_id', id)
            .preload('user', (q) => {
                q.select(['id', 'username'])
            })

        const data = reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,

            created_at: FormatService.date(review.createdAt, i18n.locale),

            user: {
                id: review.user.id,
                username: review.user.username,
            },
        }))

        return {
            success: true,
            data,
        }
    }

    async store({ auth, request, params, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const property = await Property.findOrFail(id)
        const { rating, comment } = await request.validateUsing(
            vine.compile(
                vine.object({
                    rating: vine.number().min(1).max(5),
                    comment: vine.string().trim().maxLength(2000).optional(),
                })
            )
        )

        const existing = await PropertyReview.query()
            .where('property_id', property.id)
            .where('user_id', user.id)
            .first()

        if (existing) {
            return response.unprocessableEntity({
                error: i18n.t('messages.review.already_reviewed'),
            })
        }

        const review = await PropertyReview.create({
            id: randomUUID(),
            propertyId: property.id,
            userId: user.id,
            rating,
            comment,
        })

        return response.created({ success: true, data: review })
    }

    async destroy({ auth, request, params, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const review = await PropertyReview.findOrFail(id)

        if (user.role !== 'admin' && review.userId !== user.id) {
            return response.unauthorized({
                error: i18n.t('messages.auth.unauthorized'),
            })
        }

        await review.delete()

        return { success: true, message: i18n.t('messages.review.deleted_success') }
    }
}
