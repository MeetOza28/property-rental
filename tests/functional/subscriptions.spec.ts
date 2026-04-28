import { test } from '@japa/runner'
import sinon from 'sinon'
import { setupHooks } from './setup.js'
import { createUser, ensureActiveSubscription } from '../helpers.js'
import SubscriptionPlan from '#models/subscription_plan'
import stripeConfig from '#config/stripe'
import { SubscriptionService } from '#services/subscription_service'
import Stripe from 'stripe'

const dummySession = { id: 'sess_123', url: 'https://stripe.test/checkout' }

test.group('Subscriptions', (group) => {
    setupHooks(group)

    group.each.teardown(() => {
        sinon.restore()
    })

    test('lists active plans', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        await SubscriptionPlan.firstOrCreate({ stripePriceId: 'price_test' }, {
            name: 'Test Plan',
            description: 'Test',
            stripePriceId: 'price_test',
            stripeProductId: 'prod_test',
            amount: 1000,
            currency: 'usd',
            interval: 'month',
            isActive: true,
        } as any)

        const res = await client.get('/subscriptions/plans').withGuard('api').loginAs(agent)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
    })

    test('creates checkout session', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const plan = await SubscriptionPlan.firstOrCreate(
            { stripePriceId: 'price_test_checkout' },
            {
                name: 'Test Plan',
                description: 'Test',
                stripePriceId: 'price_test_checkout',
                stripeProductId: 'prod_test',
                amount: 1000,
                currency: 'usd',
                interval: 'month',
                isActive: true,
            } as any
        )

        sinon.stub(Stripe.prototype, 'checkout').value({
            sessions: {
                create: sinon.fake.resolves(dummySession),
            },
        } as any)

        sinon.stub(Stripe.prototype, 'customers').value({
            create: sinon.fake.resolves({ id: 'cus_123' }),
        } as any)

        sinon.stub(Stripe.prototype, 'subscriptions').value({
            list: sinon.fake.resolves({ data: [] }),
            retrieve: sinon.fake.resolves({ status: 'canceled' }),
        } as any)

        const res = await client
            .post('/subscriptions/checkout')
            .json({ planId: plan.id })
            .withGuard('api')
            .loginAs(agent)

        res.assertStatus(201)
        res.assertBodyContains({ success: true, session: dummySession })
    })

    test('blocks a duplicate checkout when stripe already has an active subscription', async ({
        client,
    }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const plan = await SubscriptionPlan.firstOrCreate(
            { stripePriceId: 'price_test_duplicate' },
            {
                name: 'Test Plan',
                description: 'Test',
                stripePriceId: 'price_test_duplicate',
                stripeProductId: 'prod_test',
                amount: 1000,
                currency: 'usd',
                interval: 'month',
                isActive: true,
            } as any
        )

        sinon.stub(Stripe.prototype, 'checkout').value({
            sessions: {
                create: sinon.fake.resolves(dummySession),
            },
        } as any)

        sinon.stub(Stripe.prototype, 'customers').value({
            create: sinon.fake.resolves({ id: 'cus_123' }),
        } as any)

        sinon.stub(Stripe.prototype, 'subscriptions').value({
            list: sinon.fake.resolves({
                data: [
                    {
                        id: 'sub_active_1',
                        status: 'active',
                        cancel_at_period_end: false,
                        cancel_at: null,
                        canceled_at: null,
                        current_period_end: Math.floor(Date.now() / 1000) + 3600,
                        items: {
                            data: [
                                {
                                    price: { id: plan.stripePriceId },
                                },
                            ],
                        },
                    },
                ],
            }),
            retrieve: sinon.fake.resolves({ status: 'active' }),
        } as any)

        const res = await client
            .post('/subscriptions/checkout')
            .json({ planId: plan.id })
            .withGuard('api')
            .loginAs(agent)

        res.assertStatus(400)
        res.assertBodyContains({ error: 'You are already on this plan' })
    })

    test('creates billing portal session', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        sinon.stub(Stripe.prototype, 'billingPortal').value({
            sessions: {
                create: sinon.fake.resolves({ url: 'portal' }),
            },
        } as any)

        sinon.stub(Stripe.prototype, 'customers').value({
            create: sinon.fake.resolves({ id: 'cus_456' }),
        } as any)

        const res = await client.post('/subscriptions/portal').withGuard('api').loginAs(agent)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
    })

    test('cancels subscription', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        await ensureActiveSubscription(agent)

        sinon.stub(Stripe.prototype, 'subscriptions').value({
            update: sinon.fake.resolves({ id: 'sub_123' }),
        } as any)

        sinon.stub(SubscriptionService, 'syncFromStripeSubscription').resolves({} as any)

        const res = await client.post('/subscriptions/cancel').withGuard('api').loginAs(agent)
        res.assertStatus(200)
        res.assertBodyContains({ success: true })
    })

    test('invoices: returns 400 when stripe not configured', async ({ client }) => {
        const agent = await createUser({ role: 'agent', isActive: true } as any)
        const originalSecret = stripeConfig.secretKey
        ;(stripeConfig as any).secretKey = undefined

        const res = await client.get('/subscriptions/invoices').withGuard('api').loginAs(agent)

        res.assertStatus(400)
        res.assertBodyContains({ error: 'Stripe is not configured' })
        ;(stripeConfig as any).secretKey = originalSecret
    })

    test('webhook returns 501 when stripe not configured', async ({ client }) => {
        const originalSecret = stripeConfig.secretKey
        const originalWebhookSecret = stripeConfig.webhookSecret
        ;(stripeConfig as any).secretKey = undefined
        ;(stripeConfig as any).webhookSecret = undefined

        const res = await client.post('/webhooks/stripe').json({ type: 'test' })
        res.assertStatus(501)
        ;(stripeConfig as any).secretKey = originalSecret
        ;(stripeConfig as any).webhookSecret = originalWebhookSecret
    })
})
