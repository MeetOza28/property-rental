import Property from '#models/property'
import { SubscriptionService } from '#services/subscription_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'

export default class SubscriptionActiveMiddleware {
    async handle(ctx: HttpContext, next: NextFn) {
        const user = ctx.auth.user

        if (!user) {
            return ctx.response.unauthorized({
                error: ctx.i18n?.t?.('messages.auth.unauthorized') ?? 'Unauthorized',
            })
        }

        if (user.role === 'admin') {
            return next()
        }

        const subscription = await SubscriptionService.findActiveSubscription(user.id)

        if (!subscription && user.role === 'agent') {
            return ctx.response.forbidden({
                error:
                    ctx.i18n?.t?.('messages.subscription.required') ??
                    'Active subscription required to perform this action.',
            })
        }

        let plan =
            subscription?.plan ??
            (subscription?.planId ? await subscription.related('plan').query().first() : null)

        if (!plan && subscription?.stripeSubscriptionId) {
            try {
                await SubscriptionService.syncFromStripe(subscription.stripeSubscriptionId)

                const refreshed = await SubscriptionService.findActiveSubscription(user.id)
                plan =
                    refreshed?.plan ??
                    (refreshed?.planId ? await refreshed.related('plan').query().first() : null)
            } catch (error) {
                ctx.logger.error({ err: error }, 'subscription.sync_from_stripe_failed')
            }
        }

        if (!plan) {
            return ctx.response.forbidden({
                error:
                    ctx.i18n?.t?.('messages.subscription.plan_not_found') ??
                    'Active subscription plan not found. Please contact support.',
            })
        }

        const maxProperties = plan.maxProperties

        if (maxProperties !== null) {
            // EDGE CASE FIX: wrap the count check + intent to insert in a transaction
            // with a SELECT ... FOR UPDATE so concurrent requests can't slip through
            // the limit together.
            const withinLimit = await db.transaction(async (trx) => {
                const count = await Property.query({ client: trx })
                    .where('created_by', user.id)
                    .whereNull('deleted_at')
                    .forUpdate() // lock these rows until transaction commits
                    .count('* as total')

                const total = Number(count[0].$extras.total)
                return total < maxProperties
            })

            if (!withinLimit) {
                const upgradeMessage = (() => {
                    if (plan.name?.toLowerCase() === 'basic') {
                        return (
                            ctx.i18n?.t?.('messages.subscription.upgrade_to_pro') ??
                            'Upgrade to Pro to add more properties'
                        )
                    }
                    if (plan.name?.toLowerCase() === 'pro') {
                        return (
                            ctx.i18n?.t?.('messages.subscription.upgrade_to_premium') ??
                            'Upgrade to Premium to add more properties'
                        )
                    }
                    return (
                        ctx.i18n?.t?.('messages.subscription.upgrade_generic') ??
                        'Upgrade your plan to add more properties'
                    )
                })()

                return ctx.response.forbidden({
                    error: upgradeMessage,
                    upgrade: true,
                })
            }
        }

        return next()
    }
}
