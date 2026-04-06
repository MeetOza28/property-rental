import Property from '#models/property'
import User from '#models/user'
import { FormatService } from '#services/format_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class AdminController {
    async users({ request, i18n }: HttpContext) {
        // EDGE CASE FIX: paginate to avoid loading all users into memory
        const filters = request.qs()
        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 50
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 50, 200)
        const offset = (page - 1) * limit

        const baseQuery = User.query()
            .whereNull('deleted_at')
            .select(['id', 'email', 'role', 'is_active', 'created_at'])

        const totalRow = await baseQuery.clone().clearSelect().count('* as total')
        const total = Number(totalRow[0].$extras.total ?? 0)

        const users = await baseQuery.clone().limit(limit).offset(offset)

        const data = users.map((u) => ({
            id: u.id,
            email: u.email,
            role: u.role,
            is_active: u.isActive,
            created_at: FormatService.date(u.createdAt, i18n.locale),
        }))

        return {
            success: true,
            meta: {
                total,
                per_page: limit,
                current_page: page,
                last_page: Math.max(1, Math.ceil(total / limit)),
            },
            data,
        }
    }

    async userById({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const user = await User.query().where('id', id).whereNull('deleted_at').firstOrFail()
        const data = {
            id: user.id,
            email: user.email,
            role: user.role,
            is_active: user.isActive,
            created_at: FormatService.date(user.createdAt, i18n.locale),
        }

        return {
            success: true,
            data,
        }
    }

    async updateUserRole({ params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const { role } = await request.validateUsing(
            vine.compile(
                vine.object({
                    role: vine.enum(['admin', 'agent', 'public']),
                })
            )
        )

        const user = await User.query().where('id', id).whereNull('deleted_at').firstOrFail()
        user.role = role as any
        await user.save()

        return {
            success: true,
            message: i18n.t('messages.admin.role_updated'),
            data: user,
        }
    }

    async activateUser({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const user = await User.query().where('id', id).whereNull('deleted_at').firstOrFail()
        user.isActive = true
        await user.save()

        return {
            success: true,
            message: i18n.t('messages.admin.user_activated'),
        }
    }

    async deactivateUser({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const user = await User.query().where('id', id).whereNull('deleted_at').firstOrFail()
        user.isActive = false
        await user.save()

        return {
            success: true,
            message: i18n.t('messages.admin.user_deactivated'),
        }
    }

    async userProperties({ params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const filters = request.qs()

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10

        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const baseQuery = Property.query()
            .whereNull('deleted_at')
            .where((q) => {
                q.where('created_by', id).orWhere('assigned_agent_id', id)
            })
            .select(['id', 'name', 'slug', 'status', 'rent_amount', 'created_at', 'ward_id'])

        const totalRow = await baseQuery.clone().clearSelect().count('* as total')
        const total = Number(totalRow[0].$extras.total ?? 0)

        if (total === 0) {
            return {
                meta: {
                    total: 0,
                    per_page: limit,
                    current_page: page,
                    last_page: 1,
                },
                data: [],
            }
        }

        const rows = await baseQuery
            .clone()
            .limit(limit)
            .offset(offset)
            .preload('ward', (q) => {
                q.select(['id', 'name'])
            })

        const lastPage = Math.max(1, Math.ceil(total / limit))

        const data = rows.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,

            rent_amount: FormatService.currency(p.rentAmount, i18n.locale, currency),

            created_at: FormatService.date(p.createdAt, i18n.locale),

            ward: p.ward
                ? {
                      id: p.ward.id,
                      name: p.ward.name,
                  }
                : null,
        }))

        return {
            success: true,
            meta: {
                total,
                per_page: limit,
                current_page: page,
                last_page: lastPage,
            },
            data,
        }
    }

    async restoreUser({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const user = await User.query().where('id', id).whereNotNull('deleted_at').firstOrFail()

        user.deletedAt = null
        await user.save()

        return {
            success: true,
            data: {
                user,
            },
        }
    }

    //agents

    async agents({ request, i18n }: HttpContext) {
        // EDGE CASE FIX: paginate agent list
        const filters = request.qs()
        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 50
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 50, 200)
        const offset = (page - 1) * limit

        const baseQuery = User.query()
            .whereNull('deleted_at')
            .where('role', 'agent')
            .select(['id', 'email', 'is_active', 'created_at'])

        const totalRow = await baseQuery.clone().clearSelect().count('* as total')
        const total = Number(totalRow[0].$extras.total ?? 0)

        const agents = await baseQuery.clone().limit(limit).offset(offset)

        const data = agents.map((agent) => ({
            id: agent.id,
            email: agent.email,
            is_active: agent.isActive,
            created_at: FormatService.date(agent.createdAt, i18n.locale),
        }))

        return {
            success: true,
            meta: {
                total,
                per_page: limit,
                current_page: page,
                last_page: Math.max(1, Math.ceil(total / limit)),
            },
            data,
        }
    }

    async getAgentById({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const agent = await User.query()
            .whereNull('deleted_at')
            .where('id', id)
            .where('role', 'agent')
            .firstOrFail()
        return {
            success: true,
            data: agent,
        }
    }

    async agentStates({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const totalCreated = await Property.query()
            .whereNull('deleted_at')
            .where('created_by', id)
            .count('* as total')

        const totalAssigned = await Property.query()
            .whereNull('deleted_at')
            .where('assigned_agent_id', id)
            .count('* as total')

        const stats = {
            created_properties: totalCreated[0].$extras.total,
            assigned_properties: totalAssigned[0].$extras.total,
        }

        return {
            success: true,
            data: stats,
        }
    }

    async toggleAgentStatus({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const agent = await (async () => {
            const a = await User.query()
                .whereNull('deleted_at')
                .where('id', id)
                .where('role', 'agent')
                .firstOrFail()

            a.isActive = !a.isActive

            await a.save()

            return a
        })()

        return {
            success: true,
            message: i18n.t('messages.admin.agent_status_updated'),
            data: agent,
        }
    }
    async allProperties({ request, i18n }: HttpContext) {
        const filters = request.qs()
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10

        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const rows = await Property.query()
            .whereNull('properties.deleted_at')
            .leftJoin('wards', 'wards.id', 'properties.ward_id')
            .select([
                'properties.id',
                'properties.name',
                'properties.slug',
                'properties.status',
                'properties.rent_amount as rentAmount',
                'properties.created_at as createdAt',
                'wards.name as wardName',
            ])
            .orderBy('properties.created_at', 'desc')
            .limit(limit)
            .offset(offset)

        const data = rows.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,

            rent_amount: FormatService.currency(p.$extras.rentAmount, i18n.locale, currency),

            ward_name: p.$extras.wardName,

            created_at: FormatService.date(p.$extras.createdAt, i18n.locale),
        }))

        return {
            success: true,
            meta: {
                per_page: limit,
                current_page: page,
                next_page: rows.length === limit ? page + 1 : null,
            },
            data,
        }
    }

    async restoreProperty({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const property = await Property.query()
            .where('id', id)
            .whereNotNull('deleted_at')
            .firstOrFail()

        property.deletedAt = null
        await property.save()

        return {
            success: true,
            data: {
                property,
            },
        }
    }
}
