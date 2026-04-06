import { test } from '@japa/runner'
import User from '#models/user'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Logout', (group) => {
    setupHooks(group)

    test('logout: returns 401 when not authenticated (no token)', async ({ client }) => {
        const response = await client.post('/auth/logout')
        response.assertStatus(401)
        response.assertBodyContains({
            errors: [{ message: 'Unauthorized access' }],
        })
    })

    test('logout: succeed when authenticated', async ({ client }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client.post('/auth/logout').withGuard('api').loginAs(user)

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Logout successful',
        })
    })
})
