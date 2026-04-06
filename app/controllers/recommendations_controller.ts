import Property from '#models/property'
// import PropertyFavorite from '#models/property_favorite'
import PropertyView from '#models/property_view'
import { FormatService } from '#services/format_service'
import { RecommendationService } from '#services/recommendation_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class RecommendationsController {
    async index({ auth, request, i18n }: HttpContext) {
        // const filters = request.qs()
        const filters = await request.validateUsing(
            vine.compile(
                vine.object({
                    minPrice: vine.number().optional(),
                    maxPrice: vine.number().optional(),
                    wardId: vine.string().uuid().optional(),
                    layout: vine.string().optional(),

                    page: vine.number().min(1).optional(),
                    limit: vine.number().min(1).max(100).optional(),
                })
            )
        )

        const minPrice = filters.minPrice ? Number(filters.minPrice) : null
        const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null
        const wardId = filters.wardId || null
        const layout = filters.layout || null

        const currency = request.header('Accept-Currency') ?? 'JPY'

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        let properties: any[] = []

        if (auth.user) {
            const preferences = await RecommendationService.analyzeUserPreferences(auth.user.id)

            const query = Property.query()
                .select([
                    'id',
                    'name',
                    'slug',
                    'layout',
                    'bed_rooms',
                    'ward_id',
                    'rent_amount',
                    'created_at',
                    'view_count',
                ])
                .where('status', 'published')
                .whereNull('deleted_at')

                .whereNotIn('id', (sub) => {
                    sub.from('property_views').select('property_id').where('user_id', auth.user!.id)
                })
                .whereNotIn('id', (sub) => {
                    sub.from('property_favorites')
                        .select('property_id')
                        .where('user_id', auth.user!.id)
                })

            query
                .if(minPrice !== null, (q) => q.where('rent_amount', '>=', minPrice as number))
                .if(maxPrice !== null, (q) => q.where('rent_amount', '<=', maxPrice as number))
                .if(wardId, (q) => q.where('ward_id', wardId as string))
                .if(layout, (q) => q.where('layout', layout as string))

            const fetched = await query.limit(limit).offset(offset)

            properties = fetched.map((p) => ({
                property: p,
                score: RecommendationService.calculateRecommendationScore(p, preferences),
                reason:
                    p.wardId && preferences.preferred_wards.includes(p.wardId)
                        ? 'messages.recommendation.preferred_location'
                        : 'messages.recommendation.recommended',
            }))
        } else {
            const sessionId = request.header('x-session-id') || 'anon'
            const views = await PropertyView.query()
                .where('session_id', sessionId)
                .orderBy('viewed_at', 'desc')
                // .first()
                .limit(1)

            if (!views.length) {
                properties = await RecommendationService.getTrendingProperties(
                    filters,
                    limit,
                    offset
                )
            } else {
                properties = await RecommendationService.getSimilarProperties(
                    views[0].propertyId,
                    filters,
                    limit,
                    offset
                )
            }
        }

        const data = properties.map((item) => {
            const p = item.property

            return {
                score: item.score,
                reason: i18n.t(item.reason),
                property: {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    layout: p.layout,
                    bedRooms: p.bedRooms,
                    wardId: p.wardId,
                    rentAmount: FormatService.currency(Number(p.rentAmount), i18n.locale, currency),
                    createdAt: FormatService.date(p.createdAt, i18n.locale),
                },
            }
        })

        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total: properties.length,
            },
        }
    }

    async similar({ params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const filters = request.qs()
        const filters = await request.validateUsing(
            vine.compile(
                vine.object({
                    minPrice: vine.number().optional(),
                    maxPrice: vine.number().optional(),
                    wardId: vine.string().uuid().optional(),
                    layout: vine.string().optional(),

                    page: vine.number().min(1).optional(),
                    limit: vine.number().min(1).max(100).optional(),
                })
            )
        )
        const currency = request.header('Accept-Currency') ?? 'JPY'

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const properties = await RecommendationService.getSimilarProperties(
            id,
            filters,
            limit,
            offset
        )

        const data = properties.map((item) => {
            const p = item.property

            return {
                score: item.score,
                reason: i18n.t(item.reason),

                property: {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,

                    layout: p.layout,
                    bedRooms: p.bedRooms,
                    wardId: p.wardId,

                    rentAmount: FormatService.currency(Number(p.rentAmount), i18n.locale, currency),

                    createdAt: FormatService.date(p.createdAt, i18n.locale),
                },
            }
        })
        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total: properties.length,
            },
        }
    }

    async trending({ request, i18n }: HttpContext) {
        // const filters = request.qs()
        const filters = await request.validateUsing(
            vine.compile(
                vine.object({
                    minPrice: vine.number().optional(),
                    maxPrice: vine.number().optional(),
                    wardId: vine.string().uuid().optional(),
                    layout: vine.string().optional(),

                    page: vine.number().min(1).optional(),
                    limit: vine.number().min(1).max(100).optional(),
                })
            )
        )
        const currency = request.header('Accept-Currency') ?? 'JPY'

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const properties = await RecommendationService.getTrendingProperties(filters, limit, offset)

        const data = properties.map((item) => {
            const p = item.property

            return {
                score: item.score,
                reason: i18n.t(item.reason),

                property: {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,

                    layout: p.layout,
                    bedRooms: p.bedRooms,
                    wardId: p.wardId,

                    rentAmount: FormatService.currency(Number(p.rentAmount), i18n.locale, currency),

                    createdAt: FormatService.date(p.createdAt, i18n.locale),
                },
            }
        })
        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total: properties.length,
            },
        }
    }
}
