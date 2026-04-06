import { test } from '@japa/runner'
import { setupHooks } from './setup.js'

test.group('Systems', (group) => {
    setupHooks(group)

    test('GET /health', async ({ client }) => {
        const response = await client.get('/health')
        response.assertStatus(200)
        response.assertBodyContains({ status: 'ok', db: 'connected' })
    })

    test('GET /version', async ({ client }) => {
        const response = await client.get('/version')
        response.assertStatus(200)
        response.assertBodyContains({ version: '1.0.0' })
    })
})
