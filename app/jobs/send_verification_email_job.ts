import mail from '@adonisjs/mail/services/main'

export default class SendVerificationEmailJob {
    constructor(private payload: { email: string; username: string; token: string }) {}

    async handle() {
        const { email, username, token } = this.payload

        await mail.send((message) => {
            message.to(email).subject('Verify your account').html(`
        <h2>Welcome ${username}</h2>
        <a href="http://localhost:3335/auth/verify-email/${token}">
          Verify Email
        </a>
      `)
        })
    }
}
