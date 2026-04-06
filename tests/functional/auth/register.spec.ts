import { test } from '@japa/runner'
import User from '#models/user'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Register', (group) => {
    setupHooks(group)

    test('register: return validation error when required fields are missing', async ({
        client,
        assert,
    }) => {
        const response = await client.post('/auth/register').json({})

        response.assertStatus(422)
        const body = response.body()
        assert.property(body, 'errors')
        assert.isArray(body.errors)
        assert.isTrue(body.errors.length > 0)
        const fields = body.errors.map((e: { field: string }) => e.field)
        assert.includeMembers(fields, ['username', 'email', 'password'])
    })

    test('register: return error when email already exists', async ({ client }) => {
        await User.create({
            username: 'existing',
            email: 'existing@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const response = await client.post('/auth/register').json({
            username: 'newuser',
            email: 'existing@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        response.assertStatus(422)
        response.assertBodyContains({
            error: 'An account with this email already exists',
        })
    })

    test('register: create user account successfully', async ({ client, assert }) => {
        const response = await client.post('/auth/register').json({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        response.assertStatus(201)
        response.assertBodyContains({
            success: true,
            data: {
                username: 'johndoe',
                email: 'john@example.com',
                role: 'public',
            },
        })

        const user = await User.findByOrFail('email', 'john@example.com')
        assert.equal(user.username, 'johndoe')
        assert.isFalse(user.isActive)

        const body = response.body()
        assert.exists(body.tokens)
        assert.exists(body.tokens.accessToken.token)
        assert.exists(body.tokens.refreshToken.token)
    })
})
