import { cuid } from '@adonisjs/core/helpers'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class EnsureSessionMiddleware {
    async handle(ctx: HttpContext, next: NextFn) {
        /**
         * Middleware logic goes here (before the next call)
         */
        let sessionId = ctx.request.cookie('session_id')

        if (!sessionId && !ctx.auth.user) {
            sessionId = cuid()

            ctx.response.cookie('session_id', sessionId, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60,
            })
        }
        /**
         * Call next method in the pipeline. Do not return the output
         * because returning a non-void value from middleware can leak
         * the inner return value directly as the HTTP response body.
         */
        await next()
    }
}
