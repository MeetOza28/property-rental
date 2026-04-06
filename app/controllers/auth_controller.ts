import User from '#models/user'
import EmailVerificationToken from '#models/email_verification_token'
import PasswordResetToken from '#models/password_reset_token'
// import mail from '@adonisjs/mail/services/main'
import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { Secret } from '@adonisjs/core/helpers'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { emailQueue } from '#queues/redis'
import { FormatService } from '#services/format_service'
import { TokenService } from '#services/token_service'

export default class AuthController {
    private formatTokens(tokenPair: Awaited<ReturnType<typeof TokenService.issue>>) {
        const tokens = TokenService.serialize(tokenPair)
        return {
            tokens,
            token: tokens.accessToken, // backwards-compatible alias
        }
    }

    async register({ request, response, i18n }: HttpContext) {
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    username: vine.string().minLength(3).maxLength(50),
                    email: vine.string().email(),
                    password: vine
                        .string()
                        .minLength(8)
                        .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
                    role: vine.enum(['agent', 'public']),
                })
            )
        )

        const existingUser = await User.query()
            .where('email', payload.email)
            .whereNull('deleted_at')
            .first()

        if (existingUser) {
            return response.unprocessableEntity({
                error: i18n.t('messages.auth.email_already_exists'),
            })
        }

        const role = payload.role ?? 'public'
        const user = await User.create({
            id: randomUUID(),
            username: payload.username,
            email: payload.email,
            password: payload.password,
            role,
            isActive: false,
        })

        // send verification email
        await EmailVerificationToken.query().where('user_id', user.id).delete()

        const tokenRecord = await EmailVerificationToken.create({
            id: randomUUID(),
            userId: user.id,
            token: randomUUID(),
            expiresAt: DateTime.now().plus({ hours: 24 }),
        })

        await emailQueue.add('sendVerificationEmail', {
            email: user.email,
            username: user.username,
            token: tokenRecord.token,
        })

        const tokenPair = await TokenService.issue(user)
        const tokens = this.formatTokens(tokenPair)

        return response.created({
            success: true,
            message: i18n.t('messages.auth.registration_success'),
            ...tokens,
            data: user,
        })
    }

    async verifyEmail({ request, params, response, i18n }: HttpContext) {
        const { token } = await request.validateUsing(
            vine.compile(
                vine.object({
                    token: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const record = await EmailVerificationToken.query()
            .withScopes((scopes) => scopes.valid())
            .where('token', token)
            .first()

        if (!record) {
            return response.badRequest({
                error: i18n.t('messages.auth.invalid_or_expired_token'),
            })
        }

        const user = await record.related('user').query().firstOrFail()

        user.isActive = true
        user.emailVerifiedAt = DateTime.now()
        await user.save()

        await record.delete()
        return { success: true, message: i18n.t('messages.auth.email_verified_success') }
    }

    async login({ request, response, i18n }: HttpContext) {
        const { email, password } = await request.validateUsing(
            vine.compile(
                vine.object({
                    email: vine.string().trim().email(),
                    password: vine.string(),
                })
            )
        )

        const user = await User.query().where('email', email).whereNull('deleted_at').first()
        if (!user) {
            return response.unauthorized({
                error: i18n.t('messages.auth.invalid_credentials'),
            })
        }

        const isValid = await hash.verify(user.password, password)

        if (!isValid) {
            return response.unauthorized({
                error: i18n.t('messages.auth.invalid_credentials'),
            })
        }

        const tokenPair = await TokenService.issue(user)
        const tokens = this.formatTokens(tokenPair)

        return {
            success: true,
            message: i18n.t('messages.auth.login_success'),
            ...tokens,
            data: user,
        }
    }

    async refresh({ request, response, i18n }: HttpContext) {
        const { refreshToken } = await request.validateUsing(
            vine.compile(
                vine.object({
                    refreshToken: vine.string().trim(),
                })
            )
        )

        const verifiedRefresh = await User.refreshTokens.verify(new Secret(refreshToken))

        if (!verifiedRefresh) {
            return response.unauthorized({
                error: i18n.t('messages.auth.invalid_or_expired_token'),
            })
        }

        const user = await User.find(verifiedRefresh.tokenableId)

        if (!user || user.deletedAt) {
            return response.unauthorized({
                error: i18n.t('messages.auth.invalid_credentials'),
            })
        }

        await User.refreshTokens.delete(user, verifiedRefresh.identifier)

        const tokenPair = await TokenService.issue(user)
        const tokens = this.formatTokens(tokenPair)

        return {
            success: true,
            message: i18n.t('messages.auth.refresh_success'),
            ...tokens,
            data: user,
        }
    }

    // async logout({ auth, response, i18n }: HttpContext) {
    //     const user = auth.user!
    //     const token = auth.user?.currentAccessToken.identifier
    //     if (!token) {
    //         return response.badRequest({
    //             success: false,
    //             message: i18n.t('messages.auth.token_not_found'),
    //         })
    //     }
    //     await User.accessTokens.delete(user, token)
    //     return { success: true, message: i18n.t('messages.auth.logout_success') }
    // }

    async logout({ auth, request, response, i18n }: HttpContext) {
        if (!auth.user) {
            return response.unauthorized({
                error: i18n.t('messages.auth.token_not_found'),
            })
        }

        const user = auth.user
        const token = auth.user.currentAccessToken.identifier

        const refreshToken = request.input('refreshToken') as string | undefined

        await User.accessTokens.delete(user, token)

        if (refreshToken) {
            const verifiedRefresh = await User.refreshTokens.verify(new Secret(refreshToken))
            if (verifiedRefresh && verifiedRefresh.tokenableId === user.id) {
                await User.refreshTokens.delete(user, verifiedRefresh.identifier)
            }
        } else {
            await User.refreshTokens.deleteAll(user)
        }

        return { success: true, message: i18n.t('messages.auth.logout_success') }
    }

    async forgotPassword({ request, i18n }: HttpContext) {
        const { email } = await request.validateUsing(
            vine.compile(
                vine.object({
                    email: vine.string().email(),
                })
            )
        )

        const user = await User.findBy('email', email)

        if (user) {
            await PasswordResetToken.query().where('user_id', user.id).delete()

            const token = await PasswordResetToken.create({
                id: randomUUID(),
                userId: user.id,
                token: randomUUID(),
                expiresAt: DateTime.now().plus({ hours: 24 }),
            })

            await emailQueue.add('sendPasswordResetEmail', {
                email: user.email,
                token: token.token,
            })
        }

        return {
            success: true,
            message: i18n.t('messages.auth.forgot_password_sent'),
        }
    }

    async resetPassword({ request, response, i18n }: HttpContext) {
        const { token, password } = await request.validateUsing(
            vine.compile(
                vine.object({
                    token: vine.string(),
                    password: vine
                        .string()
                        .minLength(8)
                        .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
                })
            )
        )

        const record = await PasswordResetToken.query()
            .withScopes((scopes) => scopes.valid())
            .where('token', token)
            .first()

        if (!record) {
            return response.badRequest({
                error: i18n.t('messages.auth.invalid_or_expired_token'),
            })
        }

        const user = await record.related('user').query().firstOrFail()

        user.password = password

        await user.save()

        await record.delete()

        return {
            success: true,
            message: i18n.t('messages.auth.password_reset_success'),
        }
    }

    async resendVerification({ request, response, i18n }: HttpContext) {
        const { email } = await request.validateUsing(
            vine.compile(
                vine.object({
                    email: vine.string().email(),
                })
            )
        )
        // const user = await User.findBy('email', email)
        const user = await User.query().where('email', email).whereNull('deleted_at').first()
        if (!user) {
            return response.badRequest({
                error: i18n.t('messages.auth.user_not_found'),
            })
        }

        if (user.isActive) {
            return {
                error: i18n.t('messages.auth.user_already_verified'),
            }
        }

        await EmailVerificationToken.query().where('user_id', user.id).delete()

        const token = await EmailVerificationToken.create({
            id: randomUUID(),
            userId: user.id,
            token: randomUUID(),
            expiresAt: DateTime.now().plus({ hours: 24 }),
        })

        await emailQueue.add('sendVerificationEmail', {
            email: user.email,
            username: user.username,
            token: token.token,
        })
        return {
            success: true,
            message: i18n.t('messages.auth.resend_verification_success'),
            data: { message: i18n.t('messages.auth.verification_email_sent') },
        }
    }

    async me({ auth, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        return {
            success: true,
            data: {
                id: user.id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                created_at: FormatService.date(user.createdAt, i18n.locale),
            },
        }
    }

    async updateProfile({ auth, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    username: vine.string().minLength(3),
                })
            )
        )

        user.merge(payload)
        await user.save()

        return {
            success: true,
            message: i18n.t('messages.auth.profile_updated'),
            data: user,
        }
    }

    async changePassword({ auth, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { currentPassword, newPassword } = await request.validateUsing(
            vine.compile(
                vine.object({
                    currentPassword: vine.string(),
                    newPassword: vine
                        .string()
                        .minLength(8)
                        .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
                })
            )
        )

        const isValid = await hash.verify(user.password, currentPassword)

        if (!isValid) {
            return response.unauthorized({
                error: i18n.t('messages.auth.invalid_credentials'),
            })
        }

        user.password = newPassword
        await user.save()

        return {
            success: true,
            message: i18n.t('messages.auth.password_changed_success'),
        }
    }

    async deleteProfile({ auth, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { password } = await request.validateUsing(
            vine.compile(
                vine.object({
                    password: vine.string(),
                })
            )
        )

        const isValid = await hash.verify(user.password, password)

        if (!isValid) {
            return response.unauthorized({
                error: i18n.t('messages.auth.invalid_credentials'),
            })
        }

        const token = auth.user?.currentAccessToken?.identifier

        if (!token) {
            return response.badRequest({
                error: i18n.t('messages.auth.token_not_found'),
            })
        }
        await User.accessTokens.delete(user, token)

        user.deletedAt = DateTime.now()
        user.isActive = false

        await user.save()

        return {
            success: true,
            message: i18n.t('messages.auth.profile_deleted_success'),
        }
    }
}
