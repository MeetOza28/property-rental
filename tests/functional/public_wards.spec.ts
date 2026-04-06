import { test } from '@japa/runner'
import { setupHooks } from './setup.js'
import { createWard, createProperty, createUser } from '../helpers.js'
import TrainStation from '#models/train_station'
import { randomUUID } from 'node:crypto'

test.group('Public - Wards', (group) => {
    setupHooks(group)

    test('GET /public/wards returns wards list', async ({ client }) => {
        const ward = await createWard()

        const response = await client.get('/public/wards')
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
        response.assertBodyContains({ data: [{ id: ward.id, name: ward.name }] })
    })

    test('GET /public/wards/:id returns ward by id', async ({ client }) => {
        const ward = await createWard()

        const response = await client.get(`/public/wards/${ward.id}`)
        response.assertStatus(200)
        response.assertBodyContains({ success: true, data: { id: ward.id, name: ward.name } })
    })

    test('GET /public/wards/:id/districts returns districts', async ({ client, assert }) => {
        const ward = await createWard({ districts: ['D1', 'D2'] as any })

        const response = await client.get(`/public/wards/${ward.id}/districts`)
        response.assertStatus(200)
        const body = response.body()
        assert.deepEqual(body, { success: true, data: ['D1', 'D2'] })
    })

    test('GET /public/train-stations returns stations', async ({ client }) => {
        const station = await TrainStation.create({ id: randomUUID(), name: 'Station A' } as any)

        const response = await client.get('/public/train-stations')
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
        response.assertBodyContains({ data: [{ id: station.id, name: 'Station A' }] })
    })

    test('GET /public/train-stations/:id returns station', async ({ client }) => {
        const station = await TrainStation.create({ id: randomUUID(), name: 'Station A' } as any)

        const response = await client.get(`/public/train-stations/${station.id}`)
        response.assertStatus(200)
        response.assertBodyContains({ success: true, data: { id: station.id, name: 'Station A' } })
    })

    test('GET /public/properties/search returns results for query', async ({ client }) => {
        const ward = await createWard()
        const user = await createUser()
        await createProperty({ createdBy: user.id, wardId: ward.id, name: 'Alpha Residence' })

        const response = await client.get('/public/properties/search?q=Alpha')
        response.assertStatus(200)
        response.assertBodyContains({ success: true })
    })
})
