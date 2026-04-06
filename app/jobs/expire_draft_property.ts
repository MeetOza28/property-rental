import Property from '#models/property'

export default class ExpireDraftProperty {
    async handle(data: { propertyId: string }) {
        const property = await Property.find(data.propertyId)
        if (!property) return

        if (property.status === 'draft') {
            property.status = 'archived'
            await property.save()
        }
    }
}
