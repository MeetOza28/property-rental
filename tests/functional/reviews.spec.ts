import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser } from '../helpers.js'

test.group('Reviews', (group) => {
    setupHooks(group)

    test('public reviews index', async ({ client }) => {
        const user = await createUser()
        const property = await createProperty({ createdBy: user.id, status: 'published' })

        const response = await client.get(`/public/properties/${property.id}/reviews`)
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
    })

    test('create and delete review', async ({ client, assert }) => {
        const user = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: user.id, status: 'published' })

        const create = await client
            .post(`/properties/${property.id}/reviews`)
            .json({ rating: 5, comment: 'Great' })
            .withGuard('api')
            .loginAs(user)
        create.assertStatus(201)
        create.assertBodyContains({ success: true })
        const reviewId = create.body().data.id
        assert.exists(reviewId)

        const del = await client.delete(`/reviews/${reviewId}`).withGuard('api').loginAs(user)
        del.assertStatus(200)
        del.assertBodyContains({ success: true })
    })
})
