import { test } from '@japa/runner'
import User from '#models/user'
import EmailVerificationToken from '#models/email_verification_token'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import { setupHooks } from './setup.js'

const VALID_PASSWORD = 'Secret@123'

test.group('Auth - Verification', (group) => {
    setupHooks(group)

    test('resendVerification: return success for unverified user', async ({ client }) => {
        await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: false,
        })

        const response = await client.post('/auth/resend-verification').json({
            email: 'john@example.com',
        })

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Verification email sent successfully',
        })
    })

    test('resendVerification: return success for already verified user', async ({ client }) => {
        await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: true,
        })

        const response = await client.post('/auth/resend-verification').json({
            email: 'john@example.com',
        })

        response.assertStatus(200)
        response.assertBodyContains({
            error: 'User already verified',
        })
    })

    test('verifyEmail: return error for invalid token', async ({ client }) => {
        const response = await client.get(`/auth/verify-email/${randomUUID()}`)

        response.assertStatus(400)
        response.assertBodyContains({
            error: 'Invalid or expired token',
        })
    })

    test('verifyEmail: succeed with valid token', async ({ client, assert }) => {
        const user = await User.create({
            username: 'johndoe',
            email: 'john@example.com',
            password: VALID_PASSWORD,
            role: 'public',
            isActive: false,
        })

        const tokenRecord = await EmailVerificationToken.create({
            id: randomUUID(),
            userId: user.id,
            token: randomUUID(),
            expiresAt: DateTime.now().plus({ hours: 24 }),
        })

        const response = await client.get(`/auth/verify-email/${tokenRecord.token}`)

        response.assertStatus(200)
        response.assertBodyContains({
            success: true,
            message: 'Email verified successfully',
        })

        await user.refresh()
        assert.isTrue(user.isActive)
        assert.isNotNull(user.emailVerifiedAt)
    })
})
