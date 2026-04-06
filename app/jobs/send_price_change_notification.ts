import Property from '#models/property'
import User from '#models/user'
import mail from '@adonisjs/mail/services/main'

export default class SendPriceChangeNotification {
    constructor(private payload: any) {}

    async handle() {
        const { propertyId, newPrice } = this.payload

        await Property.findOrFail(propertyId)

        const users = await User.query().whereHas('favorites', (q) =>
            q.where('property_id', propertyId)
        )

        for (const user of users) {
            await mail.send((message) => {
                message
                    .to(user.email)
                    .subject('Price Updated')
                    .html(`<p>New Price: ${newPrice}</p>`)
            })
        }
    }
}
