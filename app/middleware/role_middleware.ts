import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RoleMiddleware {
    async handle(ctx: HttpContext, next: NextFn, roles: string[]) {
        /**
         * Middleware logic goes here (before the next call)
         */
        const user = await ctx.auth.getUserOrFail()

        if (!roles.includes(user.role)) {
            return ctx.response.unauthorized({
                message: ctx.i18n.formatMessage('messages.auth.unauthorized'),
            })
        }
        /**
         * Call next method in the pipeline and return its output
         */
        const output = await next()
        return output
    }
}
