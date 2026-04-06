import mail from '@adonisjs/mail/services/main'

export default class SendInquiryResponseEmail {
    constructor(private payload: { user: any; inquiry: any; msg: string }) {}

    async handle() {
        const { user, inquiry, msg } = this.payload
        await mail.send((message) => {
            message.to(user.email).subject(`Response to your inquiry`).html(`
          <h3>Agent Response</h3>
          <p>${msg}</p>
          <a href="http://yourapp.com/inquiries/${inquiry.id}">
            View Conversation
          </a>
        `)
        })
    }
}
