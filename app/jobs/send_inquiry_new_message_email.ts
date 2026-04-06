import mail from '@adonisjs/mail/services/main'

export default class SendInquiryNewMessageEmail {
    constructor(private payload: { agent: any; inquiry: any; msg: string }) {}

    async handle() {
        const { agent, inquiry, msg } = this.payload

        await mail.send((message) => {
            message.to(agent.email).subject(`New message on inquiry`).html(`
          <p>${msg}</p>
          <a href="http://yourapp.com/dashboard/inquiries/${inquiry.id}">
            View Conversation
          </a>
        `)
        })
    }
}
