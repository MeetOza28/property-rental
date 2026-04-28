import AgentSubscription, { SubscriptionStatus } from '#models/agent_subscription'
import SubscriptionPlan from '#models/subscription_plan'
import User from '#models/user'
import stripeConfig from '#config/stripe'
import { DateTime } from 'luxon'
import Stripe from 'stripe'

const stripeClient = stripeConfig.secretKey
    ? new Stripe(stripeConfig.secretKey, {
          apiVersion: '2025-02-24.acacia',
      })
    : null

export class SubscriptionService {
    private static ensureStripeClient() {
        if (!stripeClient) {
            throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY')
        }
        return stripeClient
    }

    static async syncFromStripeSubscription(stripeSubscription: Stripe.Subscription) {
        const user = await User.query()
            .where('stripe_customer_id', String(stripeSubscription.customer))
            .first()

        if (!user) {
            return { error: 'User not found for customer' }
        }

        const item = stripeSubscription.items?.data?.[0]

        if (!item || !item.price) {
            return { error: 'No price found in subscription' }
        }

        const priceId = item.price.id
        const plan = priceId
            ? await SubscriptionPlan.query()
                  .where('stripe_price_id', priceId)
                  .where('is_active', true)
                  .first()
            : null

        if (!plan) {
            throw new Error('Plan not found for priceId')
        }

        let subscription = await AgentSubscription.query().where('user_id', user.id).first()

        if (!subscription) {
            subscription = new AgentSubscription()
            subscription.userId = user.id
        }

        subscription.stripeSubscriptionId = stripeSubscription.id

        subscription.stripeCustomerId = String(stripeSubscription.customer)
        subscription.status = this.mapStripeStatus(stripeSubscription.status)
        subscription.planId = plan?.id ?? subscription.planId
        subscription.currentPeriodStart = stripeSubscription.current_period_start
            ? DateTime.fromSeconds(stripeSubscription.current_period_start)
            : null

        subscription.currentPeriodEnd = stripeSubscription.current_period_end
            ? DateTime.fromSeconds(stripeSubscription.current_period_end)
            : null
        subscription.cancelAt = stripeSubscription.cancel_at
            ? DateTime.fromSeconds(stripeSubscription.cancel_at)
            : null
        subscription.cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end)
        subscription.canceledAt = stripeSubscription.canceled_at
            ? DateTime.fromSeconds(stripeSubscription.canceled_at)
            : null
        subscription.endedAt = stripeSubscription.ended_at
            ? DateTime.fromSeconds(stripeSubscription.ended_at)
            : null
        subscription.metadata = stripeSubscription.metadata ?? null

        try {
            await subscription.save()
        } catch (error) {
            return { error: (error as Error).message }
        }

        return subscription
    }

    static async syncFromStripe(stripeSubscriptionId: string) {
        const stripe = this.ensureStripeClient()
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        return this.syncFromStripeSubscription(stripeSub)
    }

    private static mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
        switch (status) {
            case 'active':
                return 'active'
            case 'trialing':
                return 'trialing'
            case 'past_due':
                return 'past_due'
            case 'canceled':
                return 'canceled'
            case 'unpaid':
                return 'unpaid'
            case 'incomplete':
                return 'incomplete'
            case 'incomplete_expired':
                return 'incomplete_expired'
            default:
                return 'incomplete'
        }
    }

    static async findActiveSubscription(userId: string) {
        const nowSql = DateTime.now().toSQL()

        return (
            AgentSubscription.query()
                .where('user_id', userId)
                // Only truly active / trialing / lifetime subs that are NOT canceling
                .where((builder) => {
                    builder
                        .whereIn('status', ['active', 'trialing'])
                        .andWhere((q) => {
                            q.whereNull('cancel_at_period_end').orWhere(
                                'cancel_at_period_end',
                                false
                            )
                        })
                        .andWhereNull('canceled_at')
                        .andWhereNull('cancel_at')
                        .orWhere('status', 'lifetime')
                })
                .preload('plan')
                .andWhere((builder) => {
                    builder.whereNull('current_period_end')
                    builder.orWhere('current_period_end', '>', nowSql)
                })
                .first()
        )
    }

    static async userHasActiveSubscription(userId: string) {
        const subscription = await this.findActiveSubscription(userId)
        return Boolean(subscription)
    }
}
