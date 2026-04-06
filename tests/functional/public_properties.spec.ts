import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser, createWard } from '../helpers.js'

test.group('Public - Properties', (group) => {
    setupHooks(group)

    test('GET /public/properties returns published properties', async ({ client }) => {
        const ward = await createWard()
        const user = await createUser()
        const property = await createProperty({
            createdBy: user.id,
            wardId: ward.id,
            status: 'published',
        })

        const response = await client.get('/public/properties')
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
        response.assertBodyContains({ data: [{ id: property.id, name: property.name }] })
    })

    test('GET /public/properties/:slug returns property details', async ({ client }) => {
        const ward = await createWard()
        const user = await createUser()
        const property = await createProperty({
            createdBy: user.id,
            wardId: ward.id,
            status: 'published',
        })

        const response = await client.get(`/public/properties/${property.slug}`)
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
        response.assertBodyContains({ data: { id: property.id, slug: property.slug } })
    })

    test('GET /public/properties/trending returns list', async ({ client }) => {
        const user = await createUser()
        await createProperty({ createdBy: user.id, status: 'published', viewCount: 10 })

        const response = await client.get('/public/properties/trending')
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
    })
})
