import env from '#start/env'

export default {
    secretKey: env.get('STRIPE_SECRET_KEY'),
    webhookSecret: env.get('STRIPE_WEBHOOK_SECRET'),
    checkoutSuccessUrl: env.get('STRIPE_CHECKOUT_SUCCESS_URL'),
    checkoutCancelUrl: env.get('STRIPE_CHECKOUT_CANCEL_URL'),
    billingPortalReturnUrl: env.get('STRIPE_BILLING_PORTAL_RETURN_URL'),
}
