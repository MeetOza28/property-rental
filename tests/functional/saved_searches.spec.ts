import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createUser } from '../helpers.js'

test.group('Saved searches', (group) => {
    setupHooks(group)

    test('saved searches: create/list/show/update/toggle/destroy', async ({ client, assert }) => {
        const user = await createUser({ isActive: true } as any)

        const create = await client
            .post('/saved-searches')
            .json({
                name: 'My search',
                filters: { wardId: 'x' },
                email_alerts_enabled: true,
                alert_frequency: 'daily',
            })
            .withGuard('api')
            .loginAs(user)

        create.assertStatus(200)
        create.assertBodyContains({ success: true })
        const createdId = create.body().data.id
        assert.exists(createdId)

        const index = await client.get('/saved-searches').withGuard('api').loginAs(user)
        index.assertStatus(200)
        index.assertBodyContains({ success: true })

        const show = await client.get(`/saved-searches/${createdId}`).withGuard('api').loginAs(user)
        show.assertStatus(200)
        show.assertBodyContains({ success: true })

        const update = await client
            .patch(`/saved-searches/${createdId}`)
            .json({ name: 'My search updated' })
            .withGuard('api')
            .loginAs(user)
        update.assertStatus(200)
        update.assertBodyContains({ success: true })

        const toggle = await client
            .post(`/saved-searches/${createdId}/toggle-alerts`)
            .withGuard('api')
            .loginAs(user)
        toggle.assertStatus(200)
        toggle.assertBodyContains({ success: true })

        const destroy = await client
            .delete(`/saved-searches/${createdId}`)
            .withGuard('api')
            .loginAs(user)
        destroy.assertStatus(200)
        destroy.assertBodyContains({ success: true })
    })
})
