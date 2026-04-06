declare module 'ioredis'

declare module '#jobs/*' {
    const value: any
    export default value
}

declare module '#queues/*' {
    export const propertyQueue: any
    export const emailQueue: any
    export const connection: any
    const value: any
    export default value
}

declare module '#queues/redis' {
    export const propertyQueue: any
    export const emailQueue: any
    export const connection: any
}

declare module '@acidiney/bull-queue/commands'
declare module '@rlanz/bull-queue/commands'
declare module '@acidiney/bull-queue/queue_provider'
declare module '@rlanz/bull-queue/queue_provider'

// Fallbacks for optional packages used in the project
declare module '@acidiney/bull-queue'
declare module '@rlanz/bull-queue'
