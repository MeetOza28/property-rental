import { test } from '@japa/runner'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Password', (group) => {
    setupHooks(group)

    test('forgotPassword: returns success for existing email', async ({ client }) => {
        await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const response = await client.post('/auth/forgot-password').json({
            email: 'john@example.com',
        })

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'If that email exists, a reset link has been sent',
        })
    })

    test('forgotPassword: returns success for non-existing email (no user enumeration)', async ({
        client,
    }) => {
        const response = await client.post('/auth/forgot-password').json({
            email: 'unknown@example.com',
        })

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'If that email exists, a reset link has been sent',
        })
    })

    test('resetPassword: return error for invalid token', async ({ client }) => {
        const response = await client.post('/auth/reset-password').json({
            token: 'invalid-token',
            password: VALID_PASSWORD,
        })

        response.assertStatus(400)
        response.assertBodyContains({
            error: 'Invalid or expired token',
        })
    })

    test('resetPassword: succeed with valid token', async ({ client, assert }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const tokenRecord = await PasswordResetToken.create({
            id: randomUUID(),
            userId: user.id,
            token: randomUUID(),
            expiresAt: DateTime.now().plus({ hours: 24 }),
        })

        const response = await client.post('/auth/reset-password').json({
            token: tokenRecord.token,
            password: 'NewPass@456',
        })

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Password reset successful',
        })

        await user.refresh()
        const isValid = await import('@adonisjs/core/services/hash').then((h) =>
            h.default.verify(user.password, 'NewPass@456')
        )
        assert.isTrue(isValid)
    })

    test('resetPassword: expired token', async ({ client }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
        })

        const token = await PasswordResetToken.create({
            id: randomUUID(),
            userId: user.id,
            token: randomUUID(),
            expiresAt: DateTime.now().minus({ hours: 1 }),
        })

        const res = await client.post('/auth/reset-password').json({
            token: token.token,
            password: VALID_PASSWORD,
        })

        res.assertStatus(400)

        res.assertBodyContains({
            error: 'Invalid or expired token',
        })
    })
})
