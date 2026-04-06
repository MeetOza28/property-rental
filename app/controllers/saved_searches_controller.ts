import SavedSearch from '#models/saved_search'
import { SavedSearchService } from '#services/saved_search_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { randomUUID } from 'node:crypto'

export default class SavedSearchesController {
    async store({ auth, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().minLength(3).maxLength(100),
                    filters: vine.any(),
                    email_alerts_enabled: vine.boolean(),
                    alert_frequency: vine.enum(['instant', 'daily', 'weekly']),
                })
            )
        )

        const search = await SavedSearch.create({
            id: randomUUID(),
            userId: user.id,
            name: payload.name,
            filters: payload.filters,
            emailAlertsEnabled: payload.email_alerts_enabled,
            alertFrequency: payload.alert_frequency,
        })

        return {
            success: true,
            message: i18n.t('messages.savedSearch.created_success'),
            data: search,
        }
    }

    async index({ auth }: HttpContext) {
        const user = await auth.getUserOrFail()
        const data = await SavedSearch.query().where('user_id', user.id)
        return { success: true, data }
    }

    async show({ auth, request, params }: HttpContext) {
        const user = await auth.getUserOrFail()
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const search = await SavedSearch.query()
            .where('id', id)
            .where('user_id', user.id)
            .firstOrFail()

        const matchCount = await SavedSearchService.getMatchCount(search)

        return {
            success: true,
            data: {
                search,
                match_count: matchCount,
            },
        }
    }

    async update({ auth, params, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const search = await SavedSearch.query()
            .where('id', id)
            .where('user_id', user.id)
            .firstOrFail()

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().minLength(3).maxLength(100).optional(),
                    filters: vine.any().optional(),
                    email_alerts_enabled: vine.boolean().optional(),
                    alert_frequency: vine.enum(['instant', 'daily', 'weekly']).optional(),
                })
            )
        )

        search.merge(payload)

        await search.save()

        return {
            success: true,
            message: i18n.t('messages.savedSearch.updated_success'),
            data: search,
        }
    }

    async destroy({ auth, params, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        await SavedSearch.query().where('id', id).where('user_id', user.id).delete()

        return {
            success: true,
            message: i18n.t('messages.savedSearch.deleted_success'),
        }
    }

    async toggleAlerts({ auth, params, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const search = await SavedSearch.query()
            .where('id', id)
            .where('user_id', user.id)
            .firstOrFail()

        search.emailAlertsEnabled = !search.emailAlertsEnabled
        await search.save()

        return {
            success: true,
            enabled: search.emailAlertsEnabled,
            message: i18n.t('messages.savedSearch.alert_toggled'),
        }
    }
}
