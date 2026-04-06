import Property from '#models/property'
import SavedSearch from '#models/saved_search'
import { emailQueue } from '#queues/redis'

export default class CheckInstantAlerts {
    async handle(data: { propertyId: string }) {
        const property = await Property.findOrFail(data.propertyId)

        const searches = await SavedSearch.query()
            .where('email_alerts_enabled', true)
            .where('alert_frequency', 'instant')
            .preload('user')

        for (const search of searches) {
            if (!search.user) continue

            if (!this.matchesFilters(property, search.filters)) continue

            await emailQueue.add('sendSavedSearchEmail', {
                user: search.user.toJSON(),
                savedSearch: search.toJSON(),
                newProperties: [property.toJSON()],
            })
        }
    }

    private matchesFilters(property: any, filters: any): boolean {
        if (!filters) return false

        if (filters.ward_id && Array.isArray(filters.ward_id)) {
            if (!filters.ward_id.includes(property.wardId)) {
                return false
            }
        }

        if (filters.minRent && property.rentAmount < filters.minRent) {
            return false
        }

        if (filters.maxRent && property.rentAmount > filters.maxRent) {
            return false
        }

        return true
    }
}
