import Property from '#models/property'
import PropertyFavorite from '#models/property_favorite'
import PropertyView from '#models/property_view'
import { DateTime } from 'luxon'

export class RecommendationService {
    // Your code here

    static async getSimilarProperties(
        propertyId: string,
        filters: any,
        limit: number,
        offset: number
    ) {
        const target = await Property.query()
            .where('id', propertyId)
            .whereNull('deleted_at')
            .firstOrFail()

        const minPrice = filters.minPrice ? Number(filters.minPrice) : null
        const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null
        const wardId = filters.wardId || null
        const layout = filters.layout || null

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
            ])
            .where('status', 'published')
            .whereNot('id', propertyId)
            .whereNull('deleted_at')

        query
            .if(minPrice !== null, (q) => q.where('rent_amount', '>=', minPrice!))
            .if(maxPrice !== null, (q) => q.where('rent_amount', '<=', maxPrice!))
            .if(wardId, (q) => q.where('ward_id', wardId))
            .if(layout, (q) => q.where('layout', layout))

        const properties = await query.limit(limit).offset(offset)

        return properties.map((p) => ({
            property: p,
            score: this.calculateSimilarityScore(target, p),
            reason: 'messages.recommendation.similar',
        }))
    }

    static async getTrendingProperties(filters: any, limit: number, offset: number) {
        const minPrice = filters.minPrice ? Number(filters.minPrice) : null
        const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null
        const wardId = filters.wardId || null
        const layout = filters.layout || null

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

        query
            .if(minPrice !== null, (q) => q.where('rent_amount', '>=', minPrice!))
            .if(maxPrice !== null, (q) => q.where('rent_amount', '<=', maxPrice!))
            .if(wardId, (q) => q.where('ward_id', wardId))
            .if(layout, (q) => q.where('layout', layout))

        const properties = await query.orderBy('view_count', 'desc').limit(limit).offset(offset)

        return properties.map((p) => ({
            property: p,
            score: p.viewCount || 0,
            reason: 'messages.recommendation.trending',
        }))
    }

    static async analyzeUserPreferences(userId: string) {
        const favorites = await PropertyFavorite.query()
            .where('user_id', userId)
            .preload('property')

        const views = await PropertyView.query()
            .where('user_id', userId)
            .preload('property')
            .limit(50)

        const wardCounts: any = {}
        const layoutCounts: any = {}
        const featureCounts: any = {}
        const prices: number[] = []

        const process = (property: any, weight: number) => {
            if (!property) return

            wardCounts[property.wardId] = (wardCounts[property.wardId] || 0) + weight
            layoutCounts[property.layout] = (layoutCounts[property.layout] || 0) + weight
            prices.push(property.rentAmount)

            property.features?.forEach((f: string) => {
                featureCounts[f] = (featureCounts[f] || 0) + weight
            })
        }

        favorites.forEach((f) => process(f.property, 3))
        views.forEach((v) => process(v.property, 1))

        const minPrice = prices.length ? Math.min(...prices) : 0
        const maxPrice = prices.length ? Math.max(...prices) : 100000

        return {
            preferred_wards: this.topKeys(wardCounts, 5),
            preferred_layouts: this.topKeys(layoutCounts, 3),
            preferred_features: this.topKeys(featureCounts, 5),
            price_range: {
                minPrice,
                maxPrice,
            },
        }
    }

    static calculateRecommendationScore(property: any, pref: any) {
        let score = 0

        if (pref.preferred_wards.includes(property.wardId)) score += 30

        if (
            property.rentAmount >= pref.price_range.minPrice &&
            property.rentAmount <= pref.price_range.maxPrice
        ) {
            score += 25
        }

        if (pref.preferred_layouts.includes(property.layout)) score += 20

        const matches =
            property.features?.filter((f: string) => pref.preferred_features.includes(f)) || []

        score += matches.length * 5

        const daysOld = DateTime.now().diff(property.createdAt, 'days').days
        if (daysOld < 7) score += 10

        if (property.viewCount > 100) score += 5

        return score
    }

    static calculateSimilarityScore(p1: any, p2: any) {
        let score = 0

        if (p1.wardId === p2.wardId) score += 40

        const priceDiff = Math.abs(p1.rentAmount - p2.rentAmount) / p1.rentAmount
        if (priceDiff < 0.2) score += 30 * (1 - priceDiff)

        if (p1.layout === p2.layout) score += 15

        const common = p1.features?.filter((f: string) => p2.features?.includes(f)) || []

        score += common.length * 3

        return score
    }

    static topKeys(obj: any, limit: number) {
        return Object.entries(obj)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, limit)
            .map(([k]) => k)
    }
}
