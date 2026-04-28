import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

const smtpPort = Number(env.get('SMTP_PORT'))

const mailConfig = defineConfig({
    default: 'smtp',

    from: {
        address: env.get('SMTP_USERNAME'),
        name: 'Property Rental',
    },

    mailers: {
        smtp: transports.smtp({
            host: env.get('SMTP_HOST'),
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                type: 'login',
                user: env.get('SMTP_USERNAME'),
                pass: env.get('SMTP_PASSWORD'),
            },
        }),
    },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
    export interface MailersList extends InferMailers<typeof mailConfig> {}
}
