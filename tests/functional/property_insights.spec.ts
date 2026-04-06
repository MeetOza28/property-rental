import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser } from '../helpers.js'

test.group('Property insights (admin/agent)', (group) => {
    setupHooks(group)

    test('can fetch property views and favorites for dashboard', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: agent.id, status: 'published' })

        const views = await client
            .get(`/dashboard/properties/${property.id}/views`)
            .withGuard('api')
            .loginAs(agent)
        views.assertStatus(200)
        views.assertBodyContains({ success: true })

        const favorites = await client
            .get(`/dashboard/properties/${property.id}/favorites`)
            .withGuard('api')
            .loginAs(agent)
        favorites.assertStatus(200)
        favorites.assertBodyContains({ success: true })
    })
})
