import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser } from '../helpers.js'

test.group('Dashboard (admin/agent)', (group) => {
    setupHooks(group)

    test('dashboard endpoints require admin/agent', async ({ client }) => {
        const user = await createUser({ role: 'public', isActive: true } as any)
        const response = await client.get('/dashboard/states').withGuard('api').loginAs(user)
        response.assertStatus(401)
    })

    test('agent can access dashboard states and analytics', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        await createProperty({ createdBy: agent.id, status: 'published' })

        const states = await client.get('/dashboard/states').withGuard('api').loginAs(agent)
        states.assertStatus(200)
        states.assertBodyContains({ success: true })

        const analytics = await client
            .get('/dashboard/analytics/properties')
            .withGuard('api')
            .loginAs(agent)
        analytics.assertStatus(200)
        analytics.assertBodyContains({ success: true })
    })
})
