import { test } from '@japa/runner'
import User from '#models/user'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Login', (group) => {
    setupHooks(group)

    test('login: return error for invalid credentials - user not found', async ({ client }) => {
        const response = await client.post('/auth/login').json({
            email: 'unknown@example.com',
            password: VALID_PASSWORD,
        })

        response.assertStatus(401)
        response.assertBodyContains({
            error: 'Invalid email or password',
        })
    })

    test('login: return error for invalid credentials - wrong password', async ({ client }) => {
        await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const response = await client.post('/auth/login').json({
            email: 'john@example.com',
            password: 'WrongPass@1',
        })

        response.assertStatus(401)
        response.assertBodyContains({
            error: 'Invalid email or password',
        })
    })

    test('login: succeed with valid credentials', async ({ client, assert }) => {
        await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const response = await client.post('/auth/login').json({
            email: 'john@example.com',
            password: VALID_PASSWORD,
        })

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            data: {
                username: 'johndoe',
                email: 'john@example.com',
            },
        })
        const body = response.body()
        assert.exists(body.tokens)
        assert.exists(body.tokens.accessToken.token)
        assert.exists(body.tokens.refreshToken.token)
    })
})
