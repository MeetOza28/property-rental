import mail from '@adonisjs/mail/services/main'

export default class SendPasswordResetEmailJob {
    constructor(private payload: { email: string; token: string }) {}

    async handle() {
        const { email, token } = this.payload

        await mail.send((message) => {
            message.to(email).subject('Reset your password').html(`
        <a href="http://localhost:3000/auth/reset-password/${token}">
          Reset Password
        </a>
      `)
        })
    }
}
