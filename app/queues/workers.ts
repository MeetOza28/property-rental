import { Worker } from 'bullmq'
import logger from '@adonisjs/core/services/logger'
import { connection } from './redis.js'
// import SendNewInquiryEmail from '#jobs/send_new_inquiry_email'

new Worker(
    'propertyQueue',
    async (job) => {
        logger.info({ job: job.name, data: job.data }, 'PropertyQueue job received')

        try {
            if (job.name === 'checkInstantAlerts') {
                const { default: CheckInstantAlerts } =
                    await import('../jobs/check_instant_alerts_job.js')
                await new CheckInstantAlerts().handle(job.data)
            }

            if (job.name === 'priceChangeNotification') {
                const { default: SendPriceChangeNotification } =
                    await import('../jobs/send_price_change_notification.js')
                await new SendPriceChangeNotification(job.data).handle()
            }

            if (job.name === 'expireDraftProperty') {
                const { default: ExpireDraftProperty } =
                    await import('../jobs/expire_draft_property.js')
                await new ExpireDraftProperty().handle(job.data)
            }

            if (job.name === 'cleanupExpiredComparisons') {
                const { default: CleanupExpiredComparisons } =
                    await import('../jobs/cleanup_expired_comparisons_job.js')

                await new CleanupExpiredComparisons().handle()
            }

            // EDGE CASE FIX: delete orphaned images when a property is deleted
            if (job.name === 'cleanupPropertyImages') {
                const { default: CleanupPropertyImages } =
                    await import('../jobs/cleanup_property_images_job.js')
                await new CleanupPropertyImages().handle(job.data)
            }

            logger.info({ job: job.name }, 'PropertyQueue job completed')
        } catch (error) {
            logger.error(
                { err: error, job: job.name, attemptsMade: job.attemptsMade, data: job.data },
                'PropertyQueue job failed'
            )
            throw error
        }
    },
    { connection }
)

new Worker(
    'emailQueue',
    async (job) => {
        logger.info({ job: job.name, data: job.data }, 'EmailQueue job received')

        try {
            if (job.name === 'sendSavedSearchEmail') {
                const { default: SendSavedSearchAlertEmail } =
                    await import('../jobs/send_saved_search_alert_email.js')
                await new SendSavedSearchAlertEmail(job.data).handle()
            }

            if (job.name === 'sendVerificationEmail') {
                const { default: SendVerificationEmailJob } =
                    await import('../jobs/send_verification_email_job.js')

                await new SendVerificationEmailJob(job.data).handle()
            }

            if (job.name === 'sendPasswordResetEmail') {
                const { default: SendPasswordResetEmailJob } =
                    await import('../jobs/send_password_reset_email_job.js')

                await new SendPasswordResetEmailJob(job.data).handle()
            }

            if (job.name === 'sendNewInquiryEmail') {
                const { default: SendNewInquiryEmail } =
                    await import('../jobs/send_new_inquiry_email.js')

                await new SendNewInquiryEmail(job.data).handle()
            }

            if (job.name === 'sendInquiryResponseEmail') {
                const { default: SendInquiryResponseEmail } =
                    await import('../jobs/send_inquiry_response_email.js')

                await new SendInquiryResponseEmail(job.data).handle()
            }

            if (job.name === 'sendInquiryNewMessageEmail') {
                const { default: SendInquiryNewMessageEmail } =
                    await import('../jobs/send_inquiry_new_message_email.js')

                await new SendInquiryNewMessageEmail(job.data).handle()
            }

            if (job.name === 'sendInquiryConfirmationEmail') {
                const { default: SendInquiryConfirmationEmail } =
                    await import('../jobs/send_inquiry_confirmation_email.js')

                await new SendInquiryConfirmationEmail(job.data).handle()
            }

            logger.info({ job: job.name }, 'EmailQueue job completed')
        } catch (error) {
            logger.error(
                { err: error, job: job.name, attemptsMade: job.attemptsMade, data: job.data },
                'EmailQueue job failed'
            )
            throw error
        }
    },
    { connection }
)

logger.info('Workers running...')
