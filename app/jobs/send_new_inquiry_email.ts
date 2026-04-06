import mail from '@adonisjs/mail/services/main'

export default class SendNewInquiryEmail {
    constructor(private payload: { agent: any; inquiry: any; property: any }) {}

    async handle() {
        const { agent, inquiry, property } = this.payload

        await mail.send((message) => {
            message.to(agent.email).subject(`New inquiry for ${property.name}`).html(`
          <h2>New Inquiry</h2>
          <p><b>Property:</b> ${property.name}</p>
          <p><b>Name:</b> ${inquiry.name}</p>
          <p><b>Email:</b> ${inquiry.email}</p>
          <p><b>Message:</b> ${inquiry.message}</p>
          <a href="http://yourapp.com/dashboard/inquiries/${inquiry.id}">
            View & Respond
          </a>
        `)
        })
    }
}
