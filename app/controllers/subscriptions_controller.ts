import AgentSubscription from '#models/agent_subscription'
import SubscriptionPlan from '#models/subscription_plan'
import stripeConfig from '#config/stripe'
import { SubscriptionService } from '#services/subscription_service'
import { FormatService } from '#services/format_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Stripe from 'stripe'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

const ensureStripePrototypeStubProps = () => {
    const proto = Stripe.prototype as any
    for (const key of ['checkout', 'billingPortal', 'subscriptions', 'customers']) {
        if (!Object.prototype.hasOwnProperty.call(proto, key)) {
            Object.defineProperty(proto, key, {
                value: undefined,
                writable: true,
                configurable: true,
            })
        }
    }
}

ensureStripePrototypeStubProps()

async function ensureStripeCustomer(user: any, stripe: Stripe): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId

    // Atomic upsert: re-read inside a transaction to avoid races
    return await db.transaction(async (trx) => {
        // Re-fetch with a row lock so concurrent requests serialise here
        const fresh = await user.constructor
            .query({ client: trx })
            .where('id', user.id)
            .forUpdate()
            .firstOrFail()

        if (fresh.stripeCustomerId) {
            // Another request already created the customer
            user.stripeCustomerId = fresh.stripeCustomerId
            return fresh.stripeCustomerId
        }

        const customersApi = ((Stripe.prototype as any).customers ?? stripe.customers) as any

        const customer = await customersApi.create({
            email: user.email,
            name: user.username,
            metadata: { user_id: user.id },
        })

        await user.constructor
            .query({ client: trx })
            .where('id', user.id)
            .update({ stripe_customer_id: customer.id })

        user.stripeCustomerId = customer.id
        return customer.id
    })
}

export default class SubscriptionsController {
    async plans({ i18n }: HttpContext) {
        const plans = await SubscriptionPlan.query().where('is_active', true).orderBy('amount')

        const formatted = plans.map((plan) => ({
            ...plan.serialize(),
            amount_formatted: FormatService.currency(
                plan.amount / 100,
                i18n.locale,
                plan.currency ?? undefined
            ),
        }))
        return {
            success: true,
            message: i18n.t('messages.subscription.plans_loaded'),
            data: formatted,
        }
    }

    async current({ auth, i18n, response }: HttpContext) {
        const user = await auth.getUserOrFail()
        const subscription = await AgentSubscription.query()
            .where('user_id', user.id)
            .whereIn('status', ['active', 'trialing', 'lifetime'])
            .preload('plan')
            .orderBy('created_at', 'desc')
            .first()

        if (!subscription) {
            return response.notFound({ error: i18n.t('messages.subscription.required') })
        }

        return {
            success: true,
            message: i18n.t('messages.subscription.current'),
            data: subscription,
        }
    }

    async checkout({ auth, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { planId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    planId: vine.string().uuid(),
                })
            )
        )

        if (!stripeConfig.secretKey) {
            return response.badRequest({ error: i18n.t('messages.subscription.stripe_missing') })
        }

        const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: '2025-02-24.acacia' })
        const plan = await SubscriptionPlan.query()
            .where('id', planId)
            .where('is_active', true)
            .first()

        if (!plan) {
            return response.notFound({ error: i18n.t('messages.system.not_found') })
        }

        const customerId = await ensureStripeCustomer(user, stripe)

        const existing = await AgentSubscription.query()
            .where('user_id', user.id)
            .whereIn('status', ['active', 'trialing', 'lifetime'])
            .first()

        if (existing && plan.interval !== 'lifetime') {
            const now = DateTime.now()
            const isPendingCancel = Boolean(
                existing.cancelAtPeriodEnd || existing.cancelAt || existing.canceledAt
            )
            const periodEnded = Boolean(
                existing.currentPeriodEnd && existing.currentPeriodEnd < now
            )

            // Allow re-purchase if the current subscription is canceling/ended.
            if (!isPendingCancel && !periodEnded) {
                return response.badRequest({
                    error: i18n.t('messages.subscription.use_upgrade'),
                })
            }
        }

        if (!plan.stripePriceId) {
            return response.badRequest({
                error: i18n.t('messages.subscription.stripe_price_missing'),
            })
        }

        const isLifetime = plan.interval === 'lifetime'

        if (!isLifetime) {
            const stripeSubscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                limit: 100,
            })

            const nowUnix = DateTime.now().toUnixInteger()
            const blockingSubscription = stripeSubscriptions.data.find((subscription) => {
                const isActiveLike = ['active', 'trialing', 'past_due', 'unpaid'].includes(
                    subscription.status
                )

                if (!isActiveLike) {
                    return false
                }

                if (
                    subscription.cancel_at_period_end ||
                    subscription.cancel_at ||
                    subscription.canceled_at
                ) {
                    return false
                }

                return !subscription.current_period_end || subscription.current_period_end > nowUnix
            })

            if (blockingSubscription) {
                const currentPriceId = blockingSubscription.items.data[0]?.price?.id

                if (currentPriceId === plan.stripePriceId) {
                    return response.badRequest({
                        error: 'You are already on this plan',
                    })
                }

                return response.badRequest({
                    error: i18n.t('messages.subscription.use_upgrade'),
                })
            }
        }

        const checkoutApi = ((Stripe.prototype as any).checkout ?? stripe.checkout) as any

        const session = await checkoutApi.sessions.create({
            mode: isLifetime ? 'payment' : 'subscription',
            customer: customerId,
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            success_url: stripeConfig.checkoutSuccessUrl,
            cancel_url: stripeConfig.checkoutCancelUrl,
            expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
            metadata: {
                user_id: user.id,
                plan_id: plan.id,
            },
            ...(isLifetime
                ? {}
                : {
                      subscription_data: {
                          metadata: {
                              user_id: user.id,
                              plan_id: plan.id,
                          },
                      },
                  }),
        })
        return response.created({ success: true, session: { id: session.id, url: session.url } })
    }

    async portal({ auth, i18n, response }: HttpContext) {
        const user = await auth.getUserOrFail()

        if (!stripeConfig.secretKey) {
            return response.badRequest({ error: i18n.t('messages.subscription.stripe_missing') })
        }

        const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: '2025-02-24.acacia' })

        const customerId = await ensureStripeCustomer(user, stripe)

        const returnUrl =
            stripeConfig.billingPortalReturnUrl ??
            stripeConfig.checkoutSuccessUrl ??
            'https://example.com/account'

        // Always open the standard billing portal (manage/cancel). Avoid forcing
        // subscription_update flow so users land on the cancel/manage view instead of upgrade.
        const billingPortalApi = ((Stripe.prototype as any).billingPortal ??
            stripe.billingPortal) as any

        const session = await billingPortalApi.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        })

        return {
            success: true,
            message: i18n.t('messages.subscription.portal_created'),
            session: { url: session.url },
        }
    }

    async invoices({ auth, i18n, response }: HttpContext) {
        const user = await auth.getUserOrFail()

        if (!stripeConfig.secretKey) {
            return response.badRequest({ error: i18n.t('messages.subscription.stripe_missing') })
        }

        const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: '2025-02-24.acacia' })
        const customerId = await ensureStripeCustomer(user, stripe)

        const charges = await stripe.charges.list({
            customer: customerId,
            limit: 20,
        })

        // const invoices = await stripe.invoices.list({
        //     customer: customerId,
        //     limit: 10,
        // })

        const data = charges.data.map((charge) => ({
            id: charge.id,
            amount: charge.amount / 100,
            amount_formatted: FormatService.currency(
                charge.amount / 100,
                i18n.locale,
                charge.currency
            ),
            currency: charge.currency,
            status: charge.status,
            receipt_url: charge.receipt_url,
            created: charge.created,
        }))

        return {
            success: true,
            message: i18n.t('messages.subscription.invoices_loaded'),
            data,
        }
    }

    async cancel({ auth, i18n, response }: HttpContext) {
        const user = await auth.getUserOrFail()

        if (!stripeConfig.secretKey) {
            return response.badRequest({ error: i18n.t('messages.subscription.stripe_missing') })
        }

        const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: '2025-02-24.acacia' })

        const subscription = await AgentSubscription.query()
            .where('user_id', user.id)
            .orderBy('created_at', 'desc')
            .first()

        if (!subscription) {
            return response.notFound({ error: i18n.t('messages.subscription.not_found') })
        }

        if (subscription.status === 'lifetime') {
            return response.badRequest({
                error: i18n.t('messages.subscription.lifetime_cannot_cancel'),
            })
        }

        const stripeSubscriptionId = subscription.stripeSubscriptionId ?? subscription.id

        const subscriptionsApi = ((Stripe.prototype as any).subscriptions ??
            stripe.subscriptions) as any

        const updated = await subscriptionsApi.update(stripeSubscriptionId, {
            cancel_at_period_end: true,
        })

        await SubscriptionService.syncFromStripeSubscription(updated)

        return {
            success: true,
            message: i18n.t('messages.subscription.cancelled'),
        }
    }

    async webhook({ request, response, logger, i18n }: HttpContext) {
        // When Stripe is not configured, surface 501 so callers know the feature is unavailable
        if (!stripeConfig.secretKey || !stripeConfig.webhookSecret) {
            return response.status(501).send({
                error: i18n.t('messages.subscription.stripe_missing'),
            })
        }

        const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: '2025-02-24.acacia' })
        const signature = request.header('stripe-signature')
        const rawBody = request.raw() || JSON.stringify(request.body())

        let event: Stripe.Event

        if (!signature || !rawBody) {
            return response.badRequest({
                error: i18n.t('messages.subscription.invalid_signature'),
            })
        }

        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, stripeConfig.webhookSecret)
        } catch (error) {
            logger.error({ err: error }, 'Stripe webhook signature verification failed')
            return response.badRequest({
                error: i18n.t('messages.subscription.invalid_signature'),
            })
        }

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await SubscriptionService.syncFromStripeSubscription(
                    event.data.object as Stripe.Subscription
                )
                break
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                if (session.payment_status !== 'paid') {
                    return { received: true }
                }

                const userId = session.metadata?.user_id
                const planId = session.metadata?.plan_id

                if (!userId || !planId) {
                    return response.badRequest({
                        error: i18n.t('messages.subscription.missing_session_metadata'),
                    })
                }

                const uid = userId as string
                const pid = planId as string

                let isUpgrade = session.metadata?.upgrade === 'true'

                if (!isUpgrade && session.subscription) {
                    const stripeSub = await stripe.subscriptions.retrieve(
                        session.subscription as string
                    )
                    isUpgrade = stripeSub.metadata?.upgrade === 'true'
                }

                let subscription = await AgentSubscription.query().where('user_id', uid).first()

                if (isUpgrade && subscription) {
                    if (session.subscription) {
                        const stripeSub = await stripe.subscriptions.retrieve(
                            session.subscription as string
                        )
                        await SubscriptionService.syncFromStripeSubscription(stripeSub)
                    }
                    return { received: true }
                }

                const plan = await SubscriptionPlan.find(pid)

                if (plan?.interval === 'lifetime') {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-shadow
                        let subscription = await AgentSubscription.query()
                            .where('user_id', uid)
                            .first()

                        if (!subscription) {
                            subscription = new AgentSubscription()
                            subscription.userId = uid
                        }

                        subscription.planId = plan.id
                        subscription.status = 'lifetime'
                        subscription.currentPeriodStart = DateTime.now()
                        subscription.currentPeriodEnd = null
                        subscription.stripeSubscriptionId = null

                        await subscription.save()

                        return { received: true }
                    } catch (err) {
                        logger.error({ err }, 'subscription.lifetime_webhook_failed')
                        return response.internalServerError({
                            error: i18n.t('messages.subscription.lifetime_failed'),
                        })
                    }
                }

                if (session.subscription) {
                    // eslint-disable-next-line @typescript-eslint/no-shadow
                    const subscription = await stripe.subscriptions.retrieve(
                        session.subscription as string
                    )
                    await SubscriptionService.syncFromStripeSubscription(subscription)
                }

                break
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                if (invoice.subscription) {
                    const stripeSub = await stripe.subscriptions.retrieve(
                        invoice.subscription as string
                    )
                    await SubscriptionService.syncFromStripeSubscription(stripeSub)
                }
                break
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                if (invoice.subscription) {
                    const stripeSub = await stripe.subscriptions.retrieve(
                        invoice.subscription as string
                    )
                    await SubscriptionService.syncFromStripeSubscription(stripeSub)
                }
                break
            }
            case 'invoice.created':
                break
            default:
                break
        }

        return { received: true }
    }

    async upgrade({ auth, request, response }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { planId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    planId: vine.string().uuid(),
                })
            )
        )

        if (!stripeConfig.secretKey) {
            return response.badRequest({ error: 'Stripe not configured' })
        }

        const stripe = new Stripe(stripeConfig.secretKey, {
            apiVersion: '2025-02-24.acacia',
        })

        const plan = await SubscriptionPlan.find(planId)

        if (!plan) {
            return response.badRequest({ error: 'Plan not found' })
        }

        const currentSub = await AgentSubscription.query()
            .where('user_id', user.id)
            .orderBy('created_at', 'desc')
            .first()

        if (currentSub?.planId === plan.id) {
            return response.badRequest({
                error: 'You are already on this plan',
            })
        }

        if (currentSub?.status === 'lifetime') {
            return response.badRequest({
                error: 'You already have a lifetime plan. No upgrade needed.',
            })
        }

        // RACE CONDITION FIX: use atomic helper
        const customerId = await ensureStripeCustomer(user, stripe)

        if (plan.interval === 'lifetime') {
            if (!plan.stripePriceId) {
                return response.badRequest({ error: 'Stripe price missing' })
            }

            if (currentSub?.stripeSubscriptionId) {
                await stripe.subscriptions.cancel(currentSub.stripeSubscriptionId)
            }

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                customer: customerId,
                line_items: [
                    {
                        price: plan.stripePriceId,
                        quantity: 1,
                    },
                ],
                success_url: stripeConfig.checkoutSuccessUrl,
                cancel_url: stripeConfig.checkoutCancelUrl,
                metadata: {
                    user_id: user.id,
                    plan_id: plan.id,
                },
            })

            return response.ok({
                success: true,
                type: 'checkout',
                url: session.url,
            })
        }

        if (!currentSub?.stripeSubscriptionId) {
            return response.badRequest({
                error: 'No active subscription found',
            })
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: stripeConfig.billingPortalReturnUrl,
            flow_data: {
                type: 'subscription_update',
                subscription_update: {
                    subscription: currentSub.stripeSubscriptionId,
                },
            },
        })

        return response.ok({
            success: true,
            type: 'portal',
            url: portalSession.url,
        })
    }
}
