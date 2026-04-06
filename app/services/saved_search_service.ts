import Property from '#models/property'
import SavedSearch from '#models/saved_search'
import { DateTime } from 'luxon'

export class SavedSearchService {
    static async findNewMatches(search: SavedSearch) {
        const filters = search.filters || {}

        const query = Property.query()
            .select(['id', 'name', 'rent_amount', 'ward_id', 'layout', 'created_at'])
            .whereNull('deleted_at')
            .where('status', 'published')

        if (search.lastAlertSentAt) {
            query.where('created_at', '>', search.lastAlertSentAt.toSQL()!)
        }

        if (filters.ward_id && Array.isArray(filters.ward_id)) {
            query.whereIn('ward_id', filters.ward_id)
        }

        if (filters.minRent) {
            query.where('rent_amount', '>=', filters.minRent)
        }

        if (filters.maxRent) {
            query.where('rent_amount', '<=', filters.maxRent)
        }

        if (filters.layout && Array.isArray(filters.layout)) {
            query.whereIn('layout', filters.layout)
        }

        query.limit(100)

        return query
    }

    static async getMatchCount(search: SavedSearch) {
        const filters = search.filters || {}

        const query = Property.query().whereNull('deleted_at').where('status', 'published')

        if (search.lastAlertSentAt) {
            query.where('created_at', '>', search.lastAlertSentAt.toSQL()!)
        }

        if (filters.ward_id?.length) {
            query.whereIn('ward_id', filters.ward_id)
        }

        if (filters.minRent !== undefined) {
            query.where('rent_amount', '>=', filters.minRent)
        }

        if (filters.maxRent !== undefined) {
            query.where('rent_amount', '<=', filters.maxRent)
        }

        const result = await query.count('* as total')

        return Number(result[0].$extras.total)
    }
    static async getDueSearches(frequency: 'instant' | 'daily' | 'weekly') {
        return SavedSearch.query()
            .where('email_alerts_enabled', true)
            .where('alert_frequency', frequency)
            .preload('user', (q) => q.whereNull('deleted_at'))
    }

    static async markAlertSent(searchId: string) {
        return SavedSearch.query()
            .where('id', searchId)
            .update({ last_alert_sent_at: DateTime.now().toSQL() })
    }
}
