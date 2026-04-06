import mail from '@adonisjs/mail/services/main'

export default class SendInquiryConfirmationEmail {
    constructor(private payload: { email: string; inquiry: any; property: any }) {}

    async handle() {
        const { email, inquiry, property } = this.payload

        await mail.send((message) => {
            message.to(email).subject(`Your inquiry has been received`).html(`
          <h2>Thank you!</h2>
          <p>Property: ${property.name}</p>
          <p>We will respond shortly.</p>
          <p>Reference: ${inquiry.id}</p>
        `)
        })
    }
}
