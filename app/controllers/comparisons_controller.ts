import Property from '#models/property'
import PropertyComparison from '#models/property_comparison'
import { ComparisonService } from '#services/comparison_service'
import { FormatService } from '#services/format_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export default class ComparisonsController {
    async index({ auth, request, i18n }: HttpContext) {
        const filters = await request.validateUsing(
            vine.compile(
                vine.object({
                    // property_ids: vine.array(vine.string().uuid()).minLength(2).maxLength(4),

                    page: vine.number().optional(),
                    limit: vine.number().optional(),
                })
            )
        )

        const sessionId = request.cookie('session_id')

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const query = PropertyComparison.query()
            .select(['id', 'property_ids', 'created_at'])

            .if(auth.user, (q) => q.where('user_id', auth.user!.id))
            .if(!auth.user, (q) => q.where('session_id', sessionId!))
            .where((q) => {
                q.whereNull('expires_at').orWhere(
                    'expires_at',
                    '>',
                    DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')!
                )
            })

            .orderBy('created_at', 'desc')

        const comparisons = await query.limit(limit).offset(offset)

        const data = comparisons.map((c) => ({
            id: c.id,
            propertyIds: c.propertyIds,
            createdAt: FormatService.date(c.createdAt, i18n.locale),
        }))

        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total: comparisons.length,
            },
        }
    }

    async store({ auth, request, i18n }: HttpContext) {
        try {
            const payload = await request.validateUsing(
                vine.compile(
                    vine.object({
                        property_ids: vine.array(vine.string().uuid()).minLength(2).maxLength(4),

                        page: vine.number().optional(),
                        limit: vine.number().optional(),
                    })
                )
            )

            const propertyIds = payload.property_ids

            // const sessionId = request.cookie('session_id')
            const userId = auth.user?.id || null
            const sessionId = userId ? null : request.cookie('session_id')

            await ComparisonService.validateProperties(propertyIds)

            const comparison = await PropertyComparison.create({
                id: randomUUID(),
                userId: auth.user?.id || null,
                sessionId: auth.user ? null : sessionId,
                propertyIds: propertyIds,
                expiresAt: auth.user ? null : DateTime.now().plus({ days: 30 }),
            })

            return {
                success: true,
                message: i18n.t('messages.comparison.created'),
                data: {
                    id: comparison.id,
                    userId: auth.user?.id || null,
                    sessionId: auth.user ? null : sessionId,
                    propertyIds: comparison.propertyIds,
                    createdAt: FormatService.date(comparison.createdAt, i18n.locale),
                },
            }
        } catch (error) {
            return {
                error:
                    error instanceof Error
                        ? error.message
                        : i18n.t('messages.errors.invalid_properties'),
            }
        }
    }

    async show({ auth, params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            {
                data: params,
            }
        )

        const sessionId = request.cookie('session_id')
        const currency = request.header('Accept-Currency') ?? 'JPY'

        const comparison = await PropertyComparison.query()
            .select(['id', 'property_ids'])
            .where('id', id)
            .if(auth.user, (q) => q.where('user_id', auth.user!.id))
            .if(!auth.user, (q) => q.where('session_id', sessionId!))
            .where((q) => {
                q.whereNull('expires_at').orWhere(
                    'expires_at',
                    '>',
                    DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')!
                )
            })
            .firstOrFail()

        const properties = await Property.query()
            .select([
                'id',
                'name',
                'slug',
                'layout',
                'bed_rooms',
                'ward_id',
                'rent_amount',
                'management_fee',
                'security_deposit',
                'agency_fee',
                'key_money',
                'created_at',
            ])
            .whereIn('id', comparison.propertyIds)
            .where('status', 'published')

        const ordered = ComparisonService.orderPropertiesByIds(properties, comparison.propertyIds)

        const formattedProperties = ordered.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,

            basic: {
                ward: p.wardId,
            },

            pricing: {
                rentAmount: FormatService.currency(
                    Number(p.rentAmount ?? 0),
                    i18n.locale,
                    currency
                ),

                totalInitialCost: FormatService.currency(
                    Number(p.securityDeposit ?? 0) +
                        Number(p.keyMoney ?? 0) +
                        Number(p.agencyFee ?? 0),
                    i18n.locale,
                    currency
                ),

                totalMonthlyCost: FormatService.currency(
                    Number(p.rentAmount ?? 0) + Number(p.managementFee ?? 0),
                    i18n.locale,
                    currency
                ),
            },

            details: {
                layout: p.layout,
                bedRooms: p.bedRooms,
            },

            createdAt: FormatService.date(p.createdAt, i18n.locale),
        }))

        // const table = ComparisonService.getComparisonTable(ordered)

        return {
            success: true,
            data: {
                comparison: {
                    id: comparison.id,
                },
                properties: formattedProperties,
            },
        }
    }

    async update({ auth, params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            {
                data: params,
            }
        )

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    property_ids: vine.array(vine.string().uuid()).minLength(2).maxLength(4),

                    page: vine.number().optional(),
                    limit: vine.number().optional(),
                })
            )
        )

        const propertyIds = payload.property_ids

        const sessionId = request.cookie('session_id')

        await ComparisonService.validateProperties(propertyIds)

        const comparison = await PropertyComparison.query()
            .where('id', id)
            .if(auth.user, (q) => q.where('user_id', auth.user!.id))
            .if(!auth.user, (q) => q.where('session_id', sessionId!))
            .where((q) => {
                q.whereNull('expires_at').orWhere(
                    'expires_at',
                    '>',
                    DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')!
                )
            })
            .firstOrFail()

        comparison.propertyIds = propertyIds
        await comparison.save()

        return {
            success: true,
            message: i18n.t('messages.comparison.updated'),
            data: {
                id: comparison.id,
                propertyIds: comparison.propertyIds,
                updatedAt: FormatService.date(comparison.updatedAt, i18n.locale),
            },
        }
    }

    async destroy({ auth, params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            {
                data: params,
            }
        )

        const sessionId = request.cookie('session_id')

        const deleted = await PropertyComparison.query()
            .where('id', id)
            .if(auth.user, (q) => q.where('user_id', auth.user!.id))
            .if(!auth.user, (q) => q.where('session_id', sessionId!))
            .where((q) => {
                q.whereNull('expires_at').orWhere(
                    'expires_at',
                    '>',
                    DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')!
                )
            })
            .delete()

        if (!deleted) {
            return {
                error: i18n.t('messages.comparison.not_found'),
            }
        }

        return {
            success: true,
            message: i18n.t('messages.comparison.deleted'),
        }
    }
}
