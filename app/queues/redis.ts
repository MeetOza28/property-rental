import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import app from '@adonisjs/core/services/app'

export const connection = new IORedis({
    host: '127.0.0.1',
    port: 6379,
    // Required by BullMQ: ensure maxRetriesPerRequest is null to allow blocking commands
    // See: https://docs.bullmq.io/guide/redis
    maxRetriesPerRequest: null,
    /**
     * Avoid connecting to Redis during test boot. Tests stub queue usage and
     * should not require a running Redis instance.
     */
    lazyConnect: app.inTest,
})

export const propertyQueue = new Queue('propertyQueue', {
    connection,
})

export const emailQueue = new Queue('emailQueue', {
    connection,
})
