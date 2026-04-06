import PropertyView from '#models/property_view'
import PropertyFavorite from '#models/property_favorite'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { FormatService } from '#services/format_service'

export default class PropertyInsightsController {
    async views({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const views = await PropertyView.query()
            .where('property_id', id)
            .whereHas('property', (q) => q.whereNull('deleted_at'))

        const data = views.map((view) => ({
            id: view.id,
            property_id: view.propertyId,

            viewed_at: FormatService.date(view.viewedAt, i18n.locale),

            ip_address: view.ipAddress,
        }))
        return { success: true, data }
    }

    async favorites({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const favorites = await PropertyFavorite.query()
            .where('property_id', id)
            .whereHas('property', (q) => q.whereNull('deleted_at'))

        const data = favorites.map((fav) => ({
            id: fav.id,
            property_id: fav.propertyId,
            user_id: fav.userId,
            created_at: FormatService.date(fav.createdAt, i18n.locale),
        }))

        return { success: true, data }
    }
}
