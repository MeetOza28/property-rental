import Property from '#models/property'
import PropertyFavorite from '#models/property_favorite'
import PropertyView from '#models/property_view'
import SavedSearch from '#models/saved_search'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardAnalyticsController {
    async properties({}: HttpContext) {
        const rows = await Property.query()
            .whereNull('deleted_at')
            .select('status')
            .count('* as total')
            .groupBy('status')

        let published = 0
        let draft = 0

        rows.forEach((r) => {
            if (r.status === 'published') published = Number(r.$extras.total)
            if (r.status === 'draft') draft = Number(r.$extras.total)
        })

        return {
            success: true,
            data: {
                total: published + draft,
                published,
                draft,
            },
        }
    }

    async views({}: HttpContext) {
        const totalViews = await PropertyView.query().count('* as total')

        const topViews = await PropertyView.query()
            .select('property_id')
            .count('* as views_count')
            .groupBy('property_id')
            .orderBy('views_count', 'desc')
            .limit(5)

        const ids = topViews.map((v) => v.propertyId)

        const properties = await Property.query().whereIn('id', ids).whereNull('deleted_at')

        return {
            success: true,
            data: {
                total_views: Number(totalViews[0].$extras.total),
                most_viewed_properties: properties,
            },
        }
    }

    async favorites({}: HttpContext) {
        const totalFavorites = await PropertyFavorite.query().count('* as total')

        const topFav = await PropertyFavorite.query()
            .select('property_id')
            .count('* as fav_count')
            .groupBy('property_id')
            .orderBy('fav_count', 'desc')
            .limit(5)

        const ids = topFav.map((f) => f.propertyId)

        const properties = await Property.query().whereIn('id', ids).whereNull('deleted_at')

        return {
            success: true,
            data: {
                total_favorites: Number(totalFavorites[0].$extras.total),
                most_favorited_properties: properties,
            },
        }
    }

    async users({}: HttpContext) {
        const totalUsers = await User.query().whereNull('deleted_at').count('* as total')

        const agents = await User.query()
            .whereNull('deleted_at')
            .where('role', 'agent')
            .count('* as total')

        return {
            success: true,
            data: {
                total_users: Number(totalUsers[0].$extras.total),
                total_agents: Number(agents[0].$extras.total),
            },
        }
    }

    async searches({}: HttpContext) {
        const totalSearches = await SavedSearch.query().count('* as total')

        const activeAlerts = await SavedSearch.query()
            .where('email_alerts_enabled', true)
            .count('* as total')

        return {
            success: true,
            data: {
                total_saved_searches: Number(totalSearches[0].$extras.total),
                active_alerts: Number(activeAlerts[0].$extras.total),
            },
        }
    }
}
