import { test } from '@japa/runner'
import User from '#models/user'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Profile', (group) => {
    setupHooks(group)

    test('me: return user profile when authenticated', async ({ client }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client.get('/me').withGuard('api').loginAs(user)

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            data: {
                id: user.id,
                email: 'john@example.com',
                role: 'public',
                isActive: true,
            },
        })
    })

    test('me: return 401 when not authenticated', async ({ client }) => {
        const response = await client.get('/me')
        response.assertStatus(401)
    })

    test('updateProfile: update username when authenticated', async ({ client, assert }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client
            .put('/profile')
            .json({ username: 'johndoe_updated' })
            .withGuard('api')
            .loginAs(user)

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Profile updated',
            data: {
                username: 'johndoe_updated',
                email: 'john@example.com',
            },
        })

        await user.refresh()
        assert.equal(user.username, 'johndoe_updated')
    })

    test('changePassword: return error for wrong current password', async ({ client }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client
            .post('/change-password')
            .json({
                currentPassword: 'WrongPass@1',
                newPassword: 'NewPass@456',
            })
            .withGuard('api')
            .loginAs(user)

        response.assertStatus(401)
        response.assertBodyContains({
            error: 'Invalid email or password',
        })
    })

    test('changePassword: succeed with correct current password', async ({ client, assert }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client
            .post('/change-password')
            .json({
                currentPassword: VALID_PASSWORD,
                newPassword: 'NewPass@456',
            })
            .withGuard('api')
            .loginAs(user)

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Password changed successfully',
        })

        await user.refresh()
        const hash = await import('@adonisjs/core/services/hash')
        const isValid = await hash.default.verify(user.password, 'NewPass@456')
        assert.isTrue(isValid)
    })

    test('deleteProfile: succeed with correct password', async ({ client, assert }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client
            .delete('/profile')
            .json({ password: VALID_PASSWORD })
            .withGuard('api')
            .loginAs(user)

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Profile deleted successfully',
        })

        await user.refresh()
        assert.isNotNull(user.deletedAt)
        assert.isFalse(user.isActive)
    })
})
