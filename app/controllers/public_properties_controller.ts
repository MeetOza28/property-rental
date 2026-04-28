import Property from '#models/property'
import PropertyView from '#models/property_view'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import PropertyFavorite from '#models/property_favorite'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { FormatService } from '#services/format_service'
import { PropertySearch, PropertySearchValidationError } from '@meetoza28/adonis-geo-search'

function normalizeToArray(value: any): string[] | undefined {
    if (!value) return undefined
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split(',').filter(Boolean)
    return undefined
}

export default class PublicPropertiesController {
    async nearby({ request, response, i18n }: HttpContext) {
        const raw = request.qs()
        const currency = request.header('Accept-Currency') ?? 'JPY'

        try {
            const { rows, total, page, limit } = await PropertySearch.search(
                {
                    lat: Number(raw.lat),
                    lng: Number(raw.lng),
                    // radiusKm: Number(raw.radius) || 5, // clamped to 50 km inside the package
                    radiusKm: Number(raw.radiusKm) || 5,
                    minRent: raw.minRent ? Number(raw.minRent) : undefined,
                    maxRent: raw.maxRent ? Number(raw.maxRent) : undefined,
                    layout: raw.layout,
                    sortBy: 'distance',
                },
                {
                    page: Number(raw.page) || 1,
                    limit: Number(raw.limit) || 20,
                    includeDistance: true,
                }
            )
            const data = rows.map((p: any) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,

                rent_amount: FormatService.currency(
                    Number(p.rentAmount || 0),
                    i18n.locale,
                    currency
                ),

                view_count: FormatService.number(Number(p.viewCount || 0), i18n.locale),

                distance_km: Number(p.distance_km || 0).toFixed(2),

                layout: p.layout,
                bed_rooms: Number(p.bedRooms || 0),

                coordinates: {
                    lat: p.latitude !== null ? Number(p.latitude) : null,
                    lng: p.longitude !== null ? Number(p.longitude) : null,
                },
            }))

            return {
                success: true,
                data,
                meta: { total, page, limit, center: { lat: raw.lat, lng: raw.lng } },
            }
        } catch (err) {
            if (err instanceof PropertySearchValidationError) {
                return response.unprocessableEntity({ error: err.message, field: err.field })
            }
            throw err
        }
    }

    async index({ request, response, i18n }: HttpContext) {
        const raw = request.qs()
        const currency = request.header('Accept-Currency') ?? 'JPY'

        try {
            const { rows, total, page, limit } = await PropertySearch.search(
                {
                    wardIds: normalizeToArray(raw.wardIds),
                    stationIds: normalizeToArray(raw.stationIds),
                    stationRadiusKm: raw.stationRadiusKm ? Number(raw.stationRadiusKm) : undefined,
                    lat: raw.lat ? Number(raw.lat) : undefined, // ✅ ADD THIS
                    lng: raw.lng ? Number(raw.lng) : undefined, // ✅ ADD THIS
                    radiusKm: raw.radiusKm ? Number(raw.radiusKm) : undefined, // ✅ ADD THIS
                    layout: raw.layout,
                    structure: raw.structure,
                    bedRooms: raw.bedRooms ? Number(raw.bedRooms) : undefined,
                    features:
                        typeof raw.features === 'string'
                            ? raw.features
                                  .split(',')
                                  .map((f) => f.trim())
                                  .filter(Boolean)
                            : Array.isArray(raw.features)
                              ? raw.features
                              : undefined,
                    minRent: raw.minRent ? Number(raw.minRent) : undefined,
                    maxRent: raw.maxRent ? Number(raw.maxRent) : undefined,
                    minSize: raw.minSize ? Number(raw.minSize) : undefined,
                    maxSize: raw.maxSize ? Number(raw.maxSize) : undefined,
                    ratingMin: raw.ratingMin ? Number(raw.ratingMin) : undefined,
                    sortBy: raw.sortBy,
                },
                { page: Number(raw.page) || 1, limit: Number(raw.limit) || 20 }
            )

            return {
                success: true,
                data: rows.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    rent_amount: FormatService.currency(p.rentAmount, i18n.locale, currency),
                    view_count: FormatService.number(p.viewCount, i18n.locale),
                    average_rating: FormatService.number(Number(p.rating ?? 0), i18n.locale),
                })),
                meta: { total, page, limit },
            }
        } catch (err) {
            if (err instanceof PropertySearchValidationError) {
                return response.unprocessableEntity({ error: err.message, field: err.field })
            }
            throw err
        }
    }

    async show({ auth, params, request, response, i18n }: HttpContext) {
        const user = auth.user
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const { slug } = await request.validateUsing(
            vine.compile(
                vine.object({
                    slug: vine.string().trim().minLength(1),
                })
            ),
            { data: params }
        )

        const propertyModel = await Property.query()
            .whereNull('deleted_at')
            .where('slug', slug)
            .where('status', 'published')
            .select(['id', 'name', 'slug', 'rent_amount', 'view_count', 'ward_id'])
            .preload('ward', (wardQuery) => {
                wardQuery.select(['id', 'name'])
            })
            .first()

        if (!propertyModel) {
            return response.notFound({
                error: i18n.t('messages.property.not_found'),
            })
        }

        const favorite = user
            ? await PropertyFavorite.query()
                  .where('property_id', propertyModel.id)
                  .where('user_id', user.id)
                  .first()
            : null

        const avg = await propertyModel.related('reviews').query().avg('rating as avg')

        const property = {
            id: propertyModel.id,
            name: propertyModel.name,
            slug: propertyModel.slug,
            rent_amount: FormatService.currency(propertyModel.rentAmount, i18n.locale, currency),
            view_count: FormatService.number(propertyModel.viewCount, i18n.locale),
            average_rating: FormatService.number(Number(avg[0].$extras.avg ?? 0), i18n.locale),
            is_favorited: !!favorite,
            ward: propertyModel.ward
                ? {
                      id: propertyModel.ward.id,
                      name: propertyModel.ward.name,
                  }
                : null,
        }

        try {
            await PropertyView.create({
                id: randomUUID(),
                propertyId: property.id,
                userId: user?.id,
                sessionId: request.cookie('session_id'),
                ipAddress: request.ip(),
                userAgent: request.header('user-agent'),
                viewedAt: DateTime.now(),
            })

            await Property.query()
                .whereNull('deleted_at')
                .where('id', property.id)
                .increment('view_count', 1)
        } catch (error) {
            logger.error('View tracking failed', error)
        }

        const prop = await Property.query()
            .where('id', property.id)
            .whereNull('deleted_at')
            .select(['id', 'ward_id'])
            .first()

        if (!prop) {
            return response.notFound({
                error: i18n.t('messages.property.not_found'),
            })
        }

        let similar: any[] = []
        if (prop.wardId) {
            similar = await Property.query()
                .whereNull('deleted_at')
                .where('status', 'published')
                .where('ward_id', prop.wardId)
                .whereNot('id', property.id)
                .select(['id', 'name', 'rent_amount', 'view_count'])
                .limit(6)
        }

        return {
            success: true,
            data: {
                ...property,
                similar_properties: similar.map((p) => ({
                    id: p.id,
                    name: p.name,
                    rent_amount: FormatService.currency(p.rentAmount, i18n.locale, currency),
                    view_count: FormatService.number(p.viewCount, i18n.locale),
                })),
            },
        }
    }

    async trending({ request, i18n }: HttpContext) {
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const rows = await Property.query()
            .whereNull('deleted_at')
            .where('status', 'published')
            .select(['id', 'name', 'slug', 'rent_amount', 'view_count'])
            .orderBy('view_count', 'desc')
            .limit(10)

        const data = rows.map((p) => ({
            id: p.id,
            name: p.name,
            rent_amount: FormatService.currency(p.rentAmount, i18n.locale, currency),
            view_count: FormatService.number(p.viewCount, i18n.locale),
        }))
        return { success: true, data }
    }
}
