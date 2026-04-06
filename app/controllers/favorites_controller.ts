import Property from '#models/property'
import PropertyFavorite from '#models/property_favorite'
import { FavoriteService } from '#services/favorite_service'
import { FormatService } from '#services/format_service'
import type { HttpContext } from '@adonisjs/core/http'
// import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'
import { randomUUID } from 'node:crypto'

export default class FavoritesController {
    async index({ auth, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const filters = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().optional(),
                    limit: vine.number().optional(),
                })
            )
        )

        const baseQuery = PropertyFavorite.query()
            .select([
                'property_favorites.id',
                'property_favorites.property_id',
                'property_favorites.created_at',
            ])
            .where('user_id', user.id)
            .whereNotNull('property_id')
            .whereHas('property', (q) => {
                q.whereNull('deleted_at')
            })

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const rows = await baseQuery
            .clone()
            .select(['id', 'property_id', 'created_at'])
            .preload('property', (propertyQuery) => {
                propertyQuery
                    .whereNull('deleted_at')
                    .select(['id', 'name', 'slug', 'rent_amount', 'view_count', 'ward_id'])
                    .preload('ward', (wardQuery) => {
                        wardQuery.select(['id', 'name'])
                    })
            })
            .limit(limit)
            .offset(offset)

        const totalRow = await baseQuery.clone().clearSelect().count('* as total')

        const total = Number(totalRow[0].$extras.total ?? 0)

        const data = rows.map((fav) => ({
            id: fav.id,
            created_at: FormatService.date(fav.createdAt, i18n.locale),

            property: {
                id: fav.property.id,
                name: fav.property.name,
                slug: fav.property.slug,

                rent_amount: FormatService.currency(fav.property.rentAmount, i18n.locale, currency),

                view_count: FormatService.number(fav.property.viewCount, i18n.locale),

                ward: fav.property.ward
                    ? {
                          id: fav.property.ward.id,
                          name: fav.property.ward.name,
                      }
                    : null,
            },
        }))

        return {
            success: true,
            data,
            meta: {
                total,
                per_page: limit,
                current_page: page,
                last_page: Math.ceil(total / limit),
            },
        }
    }

    async store({ auth, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { propertyId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    propertyId: vine.string().uuid(),
                })
            )
        )

        await Property.query()
            .whereNull('deleted_at')
            .where('id', propertyId)
            .where('status', 'published')
            .select(['id'])
            .firstOrFail()

        const existing = await PropertyFavorite.query()
            .where('user_id', user.id)
            .where('property_id', propertyId)
            .first()

        const favorite =
            existing ??
            (await PropertyFavorite.create({
                id: randomUUID(),
                userId: user.id,
                propertyId,
            }))

        return {
            success: true,
            // message: 'Added to Favorites',
            message: i18n.t('messages.favorite.added_success'),
            data: favorite,
        }
    }

    async destroy({ auth, request, params, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { propertyId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    propertyId: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { propertyId } = await vine.validate({ schema: propertyIdParamSchema, data: params })
        await PropertyFavorite.query()
            .where('user_id', user.id)
            .where('property_id', propertyId)
            .delete()

        return {
            success: true,
            // message: 'Remove from Favorites',
            message: i18n.t('messages.favorite.removed_success'),
        }
    }

    async check({ auth, request, params }: HttpContext) {
        const user = await auth.getUserOrFail()
        const { propertyId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    propertyId: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { propertyId } = await vine.validate({ schema: propertyIdParamSchema, data: params })

        const favorite = await PropertyFavorite.query()
            .where('user_id', user.id)
            .where('property_id', propertyId)
            .select(['id'])
            .first()

        return {
            is_favorite: !!favorite,
        }
    }

    async bulkAdd({ auth, request }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { propertyIds } = await request.validateUsing(
            vine.compile(
                vine.object({
                    propertyIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
                })
            )
        )

        const uniqueIds = Array.from(new Set(propertyIds))

        const validProperties = await Property.query()
            .whereIn('id', uniqueIds)
            .whereNull('deleted_at')
            .where('status', 'published')
            .select(['id'])

        const validIds = validProperties.map((p) => p.id)

        const existingFavorites = await PropertyFavorite.query()
            .where('user_id', user.id)
            .whereIn('property_id', validIds)
            .select(['property_id'])

        const existingIds = new Set(existingFavorites.map((f) => f.propertyId))

        const newIds = Array.from(new Set(validIds)).filter((id) => !existingIds.has(id))

        const insertData = newIds.map((id) => ({
            id: randomUUID(),
            userId: user.id,
            propertyId: id,
        }))

        if (insertData.length) {
            await PropertyFavorite.createMany(insertData)
        }

        return {
            success: true,
            added: insertData.length,
        }
    }

    async bulkRemove({ auth, request }: HttpContext) {
        const user = await auth.getUserOrFail()
        const { propertyIds } = await request.validateUsing(
            vine.compile(
                vine.object({
                    propertyIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
                })
            )
        )

        const count = await PropertyFavorite.query()
            .where('user_id', user.id)
            .whereIn('property_id', propertyIds)
            .delete()

        return { success: true, removed: count }
    }

    async analytics({ auth, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        if (user.role !== 'admin') {
            return response.unauthorized({
                error: i18n.t('messages.auth.unauthorized'),
            })
        }

        const totalRow = await PropertyFavorite.query().count('* as total')

        const mostFavorited = await PropertyFavorite.query()
            .select('property_id')
            .count('* as favorite_count')
            .groupBy('property_id')
            .orderBy('favorite_count', 'desc')
            .limit(5)
            .preload('property', (q) => {
                q.whereNull('deleted_at')
            })

        return {
            success: true,
            data: {
                total_favorites: Number(totalRow[0].$extras.total),
                most_favorited_properties: mostFavorited,
            },
        }
    }

    async export({ auth, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const favorites = await PropertyFavorite.query()
            .where('user_id', user.id)
            .preload('property', (q) => {
                q.whereNull('deleted_at')
            })

        response.header('Content-Type', 'text/csv')
        response.header('Content-Disposition', `attachment; filename="favorites-${Date.now()}.csv"`)
        response.header('Cache-Control', 'no-store')

        const stream = response.response
        stream.write(i18n.t('messages.csv.favorites_headers') + '\n')

        for (const fav of favorites) {
            if (!fav.property) continue

            const row = [
                FavoriteService.escapeCSV(fav.property.name),

                FormatService.currency(fav.property.rentAmount, i18n.locale, currency),

                FormatService.date(fav.createdAt, i18n.locale),
            ]

            stream.write(row.join(',') + '\n')
        }

        stream.end()
    }
}
