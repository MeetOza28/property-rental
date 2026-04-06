import Property from '#models/property'
import PropertyView from '#models/property_view'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardStatesController {
    async index({}: HttpContext) {
        const property = await Property.query().whereNull('deleted_at').count('* as total')

        return { success: true, data: { total_properties: property[0].$extras.total } }
    }

    async trend({}: HttpContext) {
        const since = DateTime.now().minus({ days: 7 }).toSQL()

        const trending = await PropertyView.query()
            .select('property_id')
            .count('* as weekly_views')
            .where('viewed_at', '>=', since)
            .groupBy('property_id')
            .orderBy('weekly_views', 'desc')
            .limit(5)

        const propertyIds = trending.map((row) => row.propertyId)

        if (!propertyIds.length) {
            return { success: true, data: [] }
        }

        const properties = await Property.query()
            .whereIn('id', propertyIds)
            .whereNull('deleted_at')
            .where('status', 'published')

        return { success: true, data: properties }
    }

    async views({}: HttpContext) {
        const views = await PropertyView.query().count('* as total')

        return { success: true, data: { total_views: views[0].$extras.total } }
    }
}
