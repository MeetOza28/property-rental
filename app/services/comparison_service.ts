import Property from '#models/property'

export class ComparisonService {
    static async validateProperties(ids: string[]) {
        if (ids.length < 2 || ids.length > 4) {
            throw new Error('messages.errors.comparison_range')
        }

        const properties = await Property.query()
            .whereIn('id', ids)
            .where('status', 'published')
            .select(['id'])

        if (properties.length !== ids.length) {
            throw new Error('messages.errors.invalid_properties')
        }
    }

    static orderPropertiesByIds(properties: any[], ids: string[]) {
        return ids.map((id) => properties.find((p) => p.id === id))
    }

    static getComparisonTable(properties: any[]) {
        return {
            basicInfo: properties.map((p) => ({
                id: p.id,
                name: p.name,
                ward: p.wardId,
            })),
            pricing: properties.map((p) => ({
                id: p.id,
                rentAmount: p.rentAmount,
                totalInitialCost: (p.securityDeposit || 0) + (p.keyMoney || 0) + (p.agencyFee || 0),
                totalMonthlyCost: (p.rentAmount || 0) + (p.managementFee || 0),
            })),
        }
    }
}
