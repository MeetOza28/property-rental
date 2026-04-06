import mail from '@adonisjs/mail/services/main'

export default class SendSavedSearchAlertEmail {
    constructor(private payload: any) {}

    async handle() {
        const { user, savedSearch, newProperties } = this.payload

        await mail.send((message) => {
            message
                .to(user.email)
                .subject(`New Properties for: ${savedSearch.name}`)
                .html(`<p>${newProperties.length} new properties found.</p>`)
        })
    }
}
