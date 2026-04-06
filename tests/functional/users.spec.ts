import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser } from '../helpers.js'

test.group('Users', (group) => {
    setupHooks(group)

    test('GET /states returns total favorites', async ({ client }) => {
        const user = await createUser({ isActive: true } as any)
        const property = await createProperty({ createdBy: user.id, status: 'published' })

        await client
            .post('/favorites')
            .json({ propertyId: property.id })
            .withGuard('api')
            .loginAs(user)

        const response = await client.get('/states').withGuard('api').loginAs(user)
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
        response.assertBodyContains({ data: { total_favorites: 1 } })
    })
})
