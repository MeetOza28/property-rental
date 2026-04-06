import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
// import logger from '@adonisjs/core/services/logger'

export default class HttpExceptionHandler extends ExceptionHandler {
    /**
     * In debug mode, the exception handler will display verbose errors
     * with pretty printed stack traces.
     */
    protected debug = !app.inProduction

    /**
     * The method is used for handling errors and returning
     * response to the client
     */
    async handle(error: unknown, ctx: HttpContext) {
        return super.handle(error, ctx)
    }

    /**
     * The method is used to report error to the logging service or
     * the third party error monitoring service.
     *
     * @note You should not attempt to send a response from this method.
     */
    async report(error: unknown, ctx: HttpContext) {
        return super.report(error, ctx)
    }
}

// import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
// import app from '@adonisjs/core/services/app'
// import logger from '@adonisjs/core/services/logger'

// export default class HttpExceptionHandler extends ExceptionHandler {
//     /**
//      * In debug mode, the exception handler will display verbose errors
//      * with pretty printed stack traces.
//      */
//     protected debug = !app.inProduction

//     async handle(error: any, ctx: HttpContext) {
//         // 422 – validation failures (VineJS)
//         if (error.code === 'E_VALIDATION_ERROR') {
//             return ctx.response.status(422).send({
//                 success: false,
//                 errors: error.messages,
//             })
//         }

//         // 401 – unauthenticated / token missing
//         if (error.code === 'E_UNAUTHORIZED_ACCESS') {
//             const message =
//                 ctx.i18n?.t?.('messages.auth.unauthorized') ?? 'Unauthorized access'
//             return ctx.response.status(401).send({
//                 success: false,
//                 message,
//             })
//         }

//         // 404 – route not found
//         if (error.code === 'E_ROUTE_NOT_FOUND') {
//             return ctx.response.status(404).send({
//                 success: false,
//                 message: 'Route not found',
//             })
//         }

//         // 404 – model firstOrFail() / findOrFail() returned no row
//         if (error.code === 'E_ROW_NOT_FOUND') {
//             const message =
//                 ctx.i18n?.t?.('messages.system.not_found') ?? 'Resource not found'
//             return ctx.response.status(404).send({
//                 success: false,
//                 message,
//             })
//         }

//         // 403 – forbidden (role / subscription middleware)
//         if (error.code === 'E_AUTHORIZATION_FAILURE') {
//             const message =
//                 ctx.i18n?.t?.('messages.auth.forbidden') ?? 'Forbidden'
//             return ctx.response.status(403).send({
//                 success: false,
//                 message,
//             })
//         }

//         // Log every unhandled exception with request context
//         logger.error(
//             {
//                 err: error,
//                 url: ctx.request.url(),
//                 method: ctx.request.method(),
//             },
//             'Unhandled exception'
//         )

//         // 500 – generic fallback (never leak stack traces in production)
//         if (app.inProduction) {
//             const generic =
//                 ctx.i18n?.t?.('messages.system.something_went_wrong') ?? 'Something went wrong'
//             return ctx.response.status(500).send({
//                 success: false,
//                 message: generic,
//             })
//         }

//         return super.handle(error, ctx)
//     }

//     async report(error: unknown, ctx: HttpContext) {
//         return super.report(error, ctx)
//     }
// }
