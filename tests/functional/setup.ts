import testUtils from '@adonisjs/core/services/test_utils'
import sinon from 'sinon'
import { emailQueue } from '#queues/redis'
import { propertyQueue } from '#queues/redis'

export function setupHooks(group: any) {
    group.each.setup(async () => {
        /**
         * Prevent external side-effects (BullMQ/Redis) during tests
         */
        sinon.stub(emailQueue, 'add').resolves({} as any)
        sinon.stub(propertyQueue, 'add').resolves({} as any)

        const truncate = await testUtils.db().truncate()

        return async () => {
            sinon.restore()
            await truncate()
        }
    })
}
