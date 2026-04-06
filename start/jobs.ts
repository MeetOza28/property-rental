// const jobs: Record<string, Function> = {}

// export { jobs }

import { Queue } from 'bullmq'
import { connection } from '#queues/redis'

const propertyQueue = new Queue('propertyQueue', { connection })

export async function registerJobs() {
    try {
        const jobs = await propertyQueue.getRepeatableJobs()

        const exists = jobs.find((job) => job.name === 'cleanupExpiredComparisons')

        if (!exists) {
            await propertyQueue.add(
                'cleanupExpiredComparisons',
                {},
                {
                    jobId: 'cleanup-expired-comparisons',
                    repeat: {
                        pattern: '0 3 * * *',
                    },
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            )

            console.log('✅ cleanupExpiredComparisons scheduled')
        } else {
            console.log('⚡ cleanupExpiredComparisons already exists')
        }
    } catch (error) {
        console.error('❌ Failed to register jobs', error)
    }
}
