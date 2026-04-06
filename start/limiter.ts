/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from '@adonisjs/limiter/services/main'

export const throttle = limiter.define('global', () => {
    return limiter.allowRequests(10).every('1 minute')
})

export const loginThrottle = limiter.define('login', (ctx) => {
    return limiter.allowRequests(15).every('15 minute').usingKey(ctx.request.ip())
})

export const registerThrottle = limiter.define('register', (ctx) => {
    return limiter.allowRequests(15).every('1 hour').usingKey(ctx.request.ip())
})

export const forgotPasswordThrottle = limiter.define('forgotPassword', (ctx) => {
    const email = ctx.request.input('email')
    return limiter.allowRequests(3).every('1 hour').usingKey(email)
})

// EDGE CASE FIX: rate-limit reset-password by IP to prevent brute-force of tokens
export const resetPasswordThrottle = limiter.define('resetPassword', (ctx) => {
    return limiter.allowRequests(10).every('1 hour').usingKey(ctx.request.ip())
})

export const propertyCrudThrottle = limiter.define('propertyCrud', (ctx) => {
    return limiter.allowRequests(100).every('15 minutes').usingKey(ctx.auth.user!.id)
})

export const propertySearchThrottle = limiter.define('propertySearch', (ctx) => {
    return limiter.allowRequests(50).every('1 minute').usingKey(ctx.request.ip())
})
