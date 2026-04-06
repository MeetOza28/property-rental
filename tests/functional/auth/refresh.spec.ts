import { test } from '@japa/runner'
import User from '#models/user'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Refresh', (group) => {
    setupHooks(group)

    test('refresh: issues new tokens and rotates refresh token', async ({ client, assert }) => {
        await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const loginResponse = await client.post('/auth/login').json({
            email: 'john@example.com',
            password: VALID_PASSWORD,
        })

        const refreshToken = loginResponse.body().tokens.refreshToken.token

        const refreshResponse = await client.post('/auth/refresh').json({ refreshToken })

        refreshResponse.assertStatus(200)
        const body = refreshResponse.body()
        assert.exists(body.tokens.accessToken.token)
        assert.exists(body.tokens.refreshToken.token)

        // Old refresh token should be invalid after rotation
        const replayResponse = await client.post('/auth/refresh').json({ refreshToken })
        replayResponse.assertStatus(401)
    })

    test('refresh: returns 401 for invalid token', async ({ client }) => {
        const response = await client.post('/auth/refresh').json({ refreshToken: 'invalid' })
        response.assertStatus(401)
    })
})
