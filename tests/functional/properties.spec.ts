import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createProperty, createUser, createWard, ensureActiveSubscription } from '../helpers.js'
import { PropertyService } from '#services/property_service'
import sinon from 'sinon'
import fs from 'node:fs'

test.group('Properties (admin/agent)', (group) => {
    setupHooks(group)

    group.each.setup(() => {
        // Avoid filesystem/audit side effects in controller
        sinon.stub(PropertyService, 'audit').resolves()
        sinon.stub(PropertyService, 'handleImage').resolves({
            feature_image: null,
            other_images: [],
        } as any)

        sinon.stub(fs, 'existsSync').returns(false)
        sinon.stub(fs, 'unlinkSync').returns()
    })

    test('requires admin/agent role', async ({ client }) => {
        const user = await createUser({ role: 'public', isActive: true } as any)
        const res = await client.get('/properties').withGuard('api').loginAs(user)
        res.assertStatus(401)
    })

    test('index: success for agent', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const res = await client.get('/properties').withGuard('api').loginAs(agent)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
    })

    test('store: validation error when required fields missing', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        await ensureActiveSubscription(agent)
        const res = await client.post('/properties').json({}).withGuard('api').loginAs(agent)
        res.assertStatus(422)
    })

    test('store: forbidden without active subscription', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const ward = await createWard()

        const res = await client
            .post('/properties')
            .json({
                name: 'NoSub',
                rentAmount: 1000,
                status: 'draft',
                wardId: ward.id,
            })
            .withGuard('api')
            .loginAs(agent)

        res.assertStatus(403)
    })

    test('store: create property (draft)', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        await ensureActiveSubscription(agent)
        const ward = await createWard()

        const res = await client
            .post('/properties')
            .json({
                name: 'P1',
                rentAmount: 1000,
                status: 'draft',
                wardId: ward.id,
            })
            .withGuard('api')
            .loginAs(agent)

        res.assertStatus(201)
        res.assertBodyContains({ success: true })
        res.assertBodyContains({ properties: { name: 'P1', status: 'draft' } })
    })

    test('show: 422 for invalid uuid', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const res = await client.get('/properties/not-a-uuid').withGuard('api').loginAs(agent)
        res.assertStatus(422)
    })

    test('show: 404 when property not found', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const res = await client
            .get(`/properties/00000000-0000-0000-0000-000000000000`)
            .withGuard('api')
            .loginAs(agent)
        res.assertStatus(404)
    })

    test('show: success', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: agent.id, status: 'published' })

        const res = await client.get(`/properties/${property.id}`).withGuard('api').loginAs(agent)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
        res.assertBodyContains({ property: { id: property.id, name: property.name } })
    })

    test('update: unauthorized when not owner and not admin', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const other = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: owner.id, status: 'draft' })

        const res = await client
            .put(`/properties/${property.id}`)
            .json({ name: 'new' })
            .withGuard('api')
            .loginAs(other)
        res.assertStatus(401)
    })

    test('update: success for owner', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: owner.id, status: 'draft' })

        const res = await client
            .put(`/properties/${property.id}`)
            .json({ name: 'new name' })
            .withGuard('api')
            .loginAs(owner)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
        res.assertBodyContains({ property: { id: property.id, name: 'new name' } })
    })

    test('destroy: unauthorized when not owner and not admin', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const other = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: owner.id, status: 'draft' })

        const res = await client
            .delete(`/properties/${property.id}`)
            .withGuard('api')
            .loginAs(other)
        res.assertStatus(401)
    })

    test('destroy: success for owner', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: owner.id, status: 'draft' })

        const res = await client
            .delete(`/properties/${property.id}`)
            .withGuard('api')
            .loginAs(owner)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
    })

    test('assignAgent: only admin', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const admin = await createUser({ role: 'admin', isActive: true } as any)
        const property = await createProperty({ createdBy: agent.id, status: 'draft' })
        const targetAgent = await createUser({ role: 'agent', isActive: true } as any)

        const forbidden = await client
            .post(`/properties/${property.id}/assign-agent`)
            .json({ agentId: targetAgent.id })
            .withGuard('api')
            .loginAs(agent)
        forbidden.assertStatus(401)

        const ok = await client
            .post(`/properties/${property.id}/assign-agent`)
            .json({ agentId: targetAgent.id })
            .withGuard('api')
            .loginAs(admin)
        ok.assertStatus(200)
        ok.assertBodyContains({ success: true })
    })

    test('export: returns downloadable json', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: agent.id, status: 'published' })

        const res = await client
            .get(`/properties/${property.id}/export`)
            .withGuard('api')
            .loginAs(agent)
        res.assertStatus(200)
    })

    test('exportCsv: returns csv headers', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({ createdBy: agent.id, status: 'published' })

        const res = await client
            .get(`/properties/${property.id}/export-csv`)
            .withGuard('api')
            .loginAs(agent)

        res.assertStatus(200)
        res.assertTextIncludes('ID,Name,Slug')
    })

    test('getMatchingSavedSearches: returns counts', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const ward = await createWard()
        const property = await createProperty({
            createdBy: agent.id,
            status: 'published',
            wardId: ward.id,
        })

        const res = await client
            .get(`/properties/${property.id}/matching-searches`)
            .withGuard('api')
            .loginAs(agent)

        res.assertStatus(200)
        res.assertBodyContains({ success: true, data: { matching_saved_searches: 0 } })
    })

    test('deleteImage: owner can delete by index', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({
            createdBy: owner.id,
            status: 'draft',
            otherImages: ['/uploads/properties/a.jpg', '/uploads/properties/b.jpg'],
        })

        const res = await client
            .delete(`/properties/${property.id}/images/0`)
            .withGuard('api')
            .loginAs(owner)

        res.assertStatus(200)
        res.assertBodyContains({ success: true })
        res.assertBodyContains({ data: { other_images: ['/uploads/properties/b.jpg'] } })
    })

    test('deleteImage: unauthorized for non-owner/non-assigned agent', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const other = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({
            createdBy: owner.id,
            status: 'draft',
            otherImages: ['/uploads/properties/a.jpg'],
        })

        const res = await client
            .delete(`/properties/${property.id}/images/0`)
            .withGuard('api')
            .loginAs(other)

        res.assertStatus(401)
    })

    test('deleteImage: invalid index returns 400', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const property = await createProperty({
            createdBy: owner.id,
            status: 'draft',
            otherImages: ['/uploads/properties/a.jpg'],
        })

        const res = await client
            .delete(`/properties/${property.id}/images/5`)
            .withGuard('api')
            .loginAs(owner)

        res.assertStatus(400)
    })

    test('reorderImages: owner can reorder with matching items', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const imgs = ['/uploads/properties/a.jpg', '/uploads/properties/b.jpg']
        const property = await createProperty({
            createdBy: owner.id,
            status: 'draft',
            otherImages: imgs,
        })

        const res = await client
            .put(`/properties/${property.id}/images/reorder`)
            .json({ order: [imgs[1], imgs[0]] })
            .withGuard('api')
            .loginAs(owner)

        res.assertStatus(200)
        res.assertBodyContains({ success: true })
        res.assertBodyContains({ data: { other_images: [imgs[1], imgs[0]] } })
    })

    test('reorderImages: length mismatch returns 400', async ({ client }) => {
        const owner = await createUser({ role: 'agent', isActive: true } as any)
        const imgs = ['/uploads/properties/a.jpg', '/uploads/properties/b.jpg']
        const property = await createProperty({
            createdBy: owner.id,
            status: 'draft',
            otherImages: imgs,
        })

        const res = await client
            .put(`/properties/${property.id}/images/reorder`)
            .json({ order: [imgs[0]] })
            .withGuard('api')
            .loginAs(owner)

        res.assertStatus(400)
    })
})
