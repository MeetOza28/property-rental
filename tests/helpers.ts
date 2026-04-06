import User from '#models/user'
import Ward from '#models/ward'
import Property from '#models/property'
import AgentSubscription from '#models/agent_subscription'
import SubscriptionPlan from '#models/subscription_plan'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export const VALID_PASSWORD = 'Secret@123'

export async function createUser(params?: Partial<User>) {
    return await User.create({
        username: 'user',
        email: `user_${Date.now()}@example.com`,
        password: VALID_PASSWORD,
        role: 'public',
        isActive: true,
        ...params,
    } as any)
}

export async function createWard(params?: Partial<Ward>) {
    return await Ward.create({
        id: randomUUID(),
        name: 'Shibuya',
        prefecture: 'Tokyo',
        districts: ['A', 'B'],
        ...params,
    } as any)
}

export async function createProperty(params: Partial<Property> & { createdBy: string }) {
    const wardId = params.wardId ?? null
    return await Property.create({
        name: 'Test Property',
        slug: '',
        status: 'published',
        address: 'Tokyo',
        description: 'Nice place',
        rentAmount: 100000,
        managementFee: 0,
        securityDeposit: 0,
        guarantorFee: 0,
        agencyFee: 0,
        insurenceFee: 0,
        keyMoney: 0,
        otherInitialCosts: 0,
        guarantorCompany: null,
        fireInsurence: null,
        wardId,
        assignedAgentId: null,
        viewCount: 0,
        ...params,
    } as any)
}

export async function ensureActiveSubscription(user: User) {
    let plan = await SubscriptionPlan.query().first()

    if (!plan) {
        plan = await SubscriptionPlan.create({
            name: 'Test Plan',
            description: 'For specs',
            stripePriceId: 'price_test',
            stripeProductId: 'prod_test',
            amount: 1000,
            currency: 'usd',
            interval: 'month',
            isActive: true,
        } as any)
    }

    let subscription = await AgentSubscription.query().where('user_id', user.id).first()

    if (!subscription) {
        subscription = await AgentSubscription.create({
            userId: user.id,
            planId: plan.id,
            status: 'active',
            currentPeriodStart: DateTime.now(),
            currentPeriodEnd: DateTime.now().plus({ months: 1 }),
            cancelAtPeriodEnd: false,
        } as any)
    } else {
        subscription.status = 'active'
        subscription.planId = plan.id
        subscription.currentPeriodStart = DateTime.now()
        subscription.currentPeriodEnd = DateTime.now().plus({ months: 1 })
        subscription.cancelAtPeriodEnd = false
        await subscription.save()
    }

    return subscription
}
