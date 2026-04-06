import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser } from '../helpers.js'

test.group('Favorites', (group) => {
    setupHooks(group)

    test('favorites: requires auth', async ({ client }) => {
        const response = await client.get('/favorites')
        response.assertStatus(401)
    })

    test('favorites: can add/check/list/remove favorite', async ({ client, assert }) => {
        const user = await createUser({ role: 'public', isActive: true } as any)
        const property = await createProperty({ createdBy: user.id, status: 'published' })

        const add = await client
            .post('/favorites')
            .json({ propertyId: property.id })
            .withGuard('api')
            .loginAs(user)
        add.assertStatus(200)
        add.assertBodyContains({ success: true })

        const check = await client
            .get(`/favorites/check/${property.id}`)
            .withGuard('api')
            .loginAs(user)
        check.assertStatus(200)
        assert.deepEqual(check.body(), { is_favorite: true })

        const list = await client.get('/favorites').withGuard('api').loginAs(user)
        list.assertStatus(200)
        list.assertBodyContains({ success: true })

        const remove = await client
            .delete(`/favorites/${property.id}`)
            .withGuard('api')
            .loginAs(user)
        remove.assertStatus(200)
        remove.assertBodyContains({ success: true })
    })
})
