import PropertyComparison from '#models/property_comparison'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@rlanz/bull-queue'
import { DateTime } from 'luxon'

export default class CleanupExpiredComparisonsJob extends Job {
    // This is the path to the file that is used to create the job
    static get $$filepath() {
        return import.meta.url
    }

    /**
     * Base Entry point
     */
    async handle() {
        const now = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')

        const deleted = await PropertyComparison.query()
            .whereNotNull('expires_at')
            .where('expires_at', '<', now)
            .delete()

        logger.info(`CleanupExpiredComparisons: Deleted ${deleted} records`)
    }
}

/**
 * This is an optional method that gets called when the retries has exceeded and is marked failed.
 */
//   async rescue(payload: CleanupExpiredComparisonsJobPayload) {}
