import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser } from '../helpers.js'

test.group('Admin', (group) => {
    setupHooks(group)

    test('admin endpoints require admin role', async ({ client }) => {
        const user = await createUser({ role: 'public', isActive: true } as any)
        const response = await client.get('/admin/users').withGuard('api').loginAs(user)
        response.assertStatus(401)
    })

    test('admin can list users', async ({ client }) => {
        const admin = await createUser({ role: 'admin', isActive: true } as any)
        await createUser({ role: 'public', isActive: true } as any)

        const response = await client.get('/admin/users').withGuard('api').loginAs(admin)
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
    })

    test('admin can update user role', async ({ client }) => {
        const admin = await createUser({ role: 'admin', isActive: true } as any)
        const user = await createUser({ role: 'public', isActive: true } as any)

        const response = await client
            .put(`/admin/users/${user.id}/role`)
            .json({ role: 'agent' })
            .withGuard('api')
            .loginAs(admin)

        response.assertStatus(200)
        response.assertBodyContains({ success: true })
    })

    test('admin can view user properties', async ({ client }) => {
        const admin = await createUser({ role: 'admin', isActive: true } as any)
        const user = await createUser({ role: 'public', isActive: true } as any)
        await createProperty({ createdBy: user.id, status: 'published' })

        const response = await client
            .get(`/admin/users/${user.id}/properties`)
            .withGuard('api')
            .loginAs(admin)

        response.assertStatus(200)
        response.assertBodyContains({ success: true })
    })
})
