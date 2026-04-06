import Property from '#models/property'
import PropertyView from '#models/property_view'
import SavedSearch from '#models/saved_search'
import { PropertyService } from '#services/property_service'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import fs from 'node:fs'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import { propertyQueue } from '../queues/redis.js'
import { FavoriteService } from '#services/favorite_service'
import { FormatService } from '#services/format_service'

const DRAFT_EXPIRY_DELAY_MS = 7 * 24 * 60 * 60 * 1000

export default class PropertiesController {
    /**
     * Display a list of resource
     */
    async index({ auth, request, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const filters = request.qs()
        const rawLimit = Number(filters.limit) || 10
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)

        const query = await PropertyService.buildVisiblePropertiesQuery(user)
            .leftJoin('wards', 'wards.id', 'properties.ward_id')
            .select([
                'properties.id',
                'properties.name',
                'properties.slug',
                'properties.status',
                'properties.rent_amount',
                'properties.management_fee',
                'properties.security_deposit',
                'properties.key_money',
                'properties.other_initial_costs',
                'properties.view_count',
                'properties.created_at',
                'wards.name as ward_name',
            ])
            .orderBy('properties.created_at', 'desc')
            .limit(limit)

        const rows = await query

        const data = rows.map((property: any) => ({
            id: property.id,
            name: property.name,
            slug: property.slug,
            status: property.status,
            rent_amount: FormatService.currency(property.rentAmount, i18n.locale, currency),
            view_count: FormatService.number(property.viewCount, i18n.locale),
            ward_name: property.$extras.ward_name,
            created_at: FormatService.date(property.createdAt.toJSDate(), i18n.locale),
        }))

        return {
            success: true,
            message: i18n.t('messages.property.list_success'),
            meta: {
                limit,
                next_page: rows.length === limit,
            },
            data,
        }
    }

    /**
     * Handle form submission for the create action
     */
    async store({ auth, request, response, i18n }: HttpContext) {
        // const user = await auth.getUserOrFail()
        const user = auth.user!

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string(),
                    slug: vine.string().optional(),
                    rentAmount: vine.number().positive(),
                    status: vine.enum(['draft', 'published', 'archived']),
                    featureImage: vine
                        .file({
                            size: '5mb',
                            extnames: ['jpg', 'jpeg', 'png'],
                        })
                        .optional(),

                    otherImages: vine
                        .array(
                            vine.file({
                                size: '5mb',
                                extnames: ['jpg', 'png', 'jpeg'],
                            })
                        )
                        .maxLength(10)
                        .optional(),
                    wardId: vine.string().uuid(),
                    description: vine.string().optional(),
                    address: vine.string().optional(),
                    latitude: vine.number().optional(),
                    longitude: vine.number().optional(),
                    layout: vine.string().optional(),
                    bedRooms: vine.number().optional(),
                    sizeSqm: vine.number().optional(),
                    managementFee: vine.number().optional(),
                    securityDeposit: vine.number().optional(),
                    keyMoney: vine.number().optional(),
                    otherInitialCosts: vine.number().optional(),
                    features: vine.array(vine.string()).optional(),
                })
            )
        )

        const { featureImage, otherImages, ...propertyData } = payload as any

        const property = await Property.create({
            ...propertyData,
            createdBy: user.id,
        })

        await property.load('ward')

        await PropertyService.audit('property:created', user.id, property.id, propertyData)

        if (property.status === 'published') {
            await propertyQueue.add(
                'checkInstantAlerts',
                { propertyId: property.id },
                { attempts: 3 }
            )
        }

        if (property.status === 'draft') {
            await propertyQueue.add(
                'expireDraftProperty',
                { propertyId: property.id },
                { delay: DRAFT_EXPIRY_DELAY_MS }
            )
        }

        const properties = {
            id: property.id,
            name: property.name,
            slug: property.slug,
            status: property.status,
            rent_amount: property.rentAmount,
            view_count: property.viewCount,
            ward: property.ward
                ? {
                      id: property.ward.id,
                      name: property.ward.name,
                  }
                : null,
            created_at: property.createdAt,
        }

        await PropertyService.handleImage(properties.id, user, featureImage, otherImages)

        return response.created({
            success: true,
            // message: 'Property Created Successfully',
            message: i18n.t('messages.property.created_success'),
            properties,
        })
    }

    /**
     * Show individual record
     */
    async show({ auth, request, params, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const currency = request.header('Accept-Currency') ?? 'JPY'

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: propertyIdParamSchema, data: params })

        const propertyModel = await Property.query()
            .whereNull('deleted_at')
            .where('id', id)
            .preload('ward')
            .firstOrFail()

        const isOwner =
            user.role === 'admin' ||
            propertyModel.createdBy === user.id ||
            propertyModel.assignedAgentId === user.id

        if (!isOwner) {
            await PropertyView.create({
                id: randomUUID(),
                propertyId: propertyModel.id,
                userId: user.id,
                viewedAt: DateTime.now(),
            })

            await Property.query()
                .whereNull('deleted_at')
                .where('id', propertyModel.id)
                .increment('view_count', 1)
        }

        const property = {
            id: propertyModel.id,
            name: propertyModel.name,
            slug: propertyModel.slug,
            status: propertyModel.status,

            rent_amount: FormatService.currency(propertyModel.rentAmount, i18n.locale, currency),

            management_fee: FormatService.currency(
                propertyModel.managementFee ?? 0,
                i18n.locale,
                currency
            ),

            security_deposit: FormatService.currency(
                propertyModel.securityDeposit ?? 0,
                i18n.locale,
                currency
            ),

            key_money: FormatService.currency(propertyModel.keyMoney ?? 0, i18n.locale, currency),

            other_initial_costs: FormatService.currency(
                propertyModel.otherInitialCosts ?? 0,
                i18n.locale,
                currency
            ),

            totalMonthlyCost: FormatService.currency(
                propertyModel.totalMonthlyCost,
                i18n.locale,
                currency
            ),
            totalInitialCost: FormatService.currency(
                propertyModel.totalInitialCost,
                i18n.locale,
                currency
            ),

            view_count: FormatService.number(propertyModel.viewCount, i18n.locale),

            ward: propertyModel.ward
                ? {
                      id: propertyModel.ward.id,
                      name: propertyModel.ward.name,
                  }
                : null,

            created_at: FormatService.date(propertyModel.createdAt.toJSDate(), i18n.locale),
        }

        return {
            success: true,
            // message: 'Property Fetched Successfully',
            message: i18n.t('messages.property.fetched_success'),
            property,
        }
    }

    /**
     * Handle form submission for the edit action
     */
    async update({ auth, request, params, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: propertyIdParamSchema, data: params })
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().minLength(2).optional(),
                    status: vine.enum(['draft', 'published', 'archived']).optional(),
                    address: vine.string().optional(),
                    description: vine.string().optional(),
                    latitude: vine.number().optional(),
                    longitude: vine.number().optional(),
                    layout: vine.string().optional(),
                    bedRooms: vine.number().min(0).optional(),
                    roomNumber: vine.string().optional(),
                    sizeSqm: vine.number().min(0).optional(),
                    age: vine.number().min(0).optional(),
                    floor: vine.number().min(0).optional(),
                    structure: vine.enum(['apartment', 'mansion', 'house']).optional(),
                    featureImage: vine
                        .file({
                            size: '5mb',
                            extnames: ['jpg', 'jpeg', 'png'],
                        })
                        .optional(),

                    otherImages: vine
                        .array(
                            vine.file({
                                size: '5mb',
                                extnames: ['jpg', 'png', 'jpeg'],
                            })
                        )
                        .maxLength(10)
                        .optional(),
                    rentAmount: vine.number().positive().optional(),
                    managementFee: vine.number().min(0).optional(),
                    securityDeposit: vine.number().min(0).optional(),
                    guarantorFee: vine.number().min(0).optional(),
                    agencyFee: vine.number().min(0).optional(),
                    insurenceFee: vine.number().min(0).optional(),
                    keyMoney: vine.number().min(0).optional(),
                    otherInitialCosts: vine.number().min(0).optional(),
                    guarantorCompany: vine.string().optional(),
                    fireInsurence: vine.string().optional(),
                    features: vine.array(vine.string()).optional(),
                    wardId: vine.string().uuid().optional(),
                    assignedAgentId: vine.string().uuid().optional(),
                })
            )
        )

        const propertyModel = await Property.query()
            .where('id', id)
            .whereNull('deleted_at')
            .firstOrFail()

        if (user.role !== 'admin' && propertyModel.createdBy !== user.id) {
            return response.unauthorized({
                error: i18n.t('messages.auth.unauthorized'),
            })
        }

        const oldPrice = propertyModel.rentAmount
        const wasPublished = propertyModel.status === 'published'
        const { featureImage, otherImages, ...safeData } = payload as any

        propertyModel.merge(safeData)
        await propertyModel.save()

        if (oldPrice !== propertyModel.rentAmount) {
            await propertyQueue.add(
                'priceChangeNotification',
                {
                    propertyId: propertyModel.id,
                    oldPrice,
                    newPrice: propertyModel.rentAmount,
                },
                { attempts: 3 }
            )
        }

        await PropertyService.audit('property:updated', user.id, propertyModel.id, safeData)

        const becamePublished = !wasPublished && propertyModel.status === 'published'
        if (becamePublished) {
            await propertyQueue.add('checkInstantAlerts', { propertyId: propertyModel.id })
        }

        const property = {
            id: propertyModel.id,
            name: propertyModel.name,
            slug: propertyModel.slug,
            status: propertyModel.status,
            rent_amount: propertyModel.rentAmount,
            view_count: propertyModel.viewCount,
            updated_at: propertyModel.updatedAt,
        }

        if (featureImage || otherImages) {
            await PropertyService.handleImage(property.id, user, featureImage, otherImages)
        }

        return {
            success: true,
            // message: 'Property Updated Successfully',
            message: i18n.t('messages.property.updated_success'),
            property,
        }
    }

    /**
     * Delete record
     */
    async destroy({ auth, params, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: propertyIdParamSchema, data: params })
        const property = await Property.query()
            .where('id', id)
            .whereNull('deleted_at')
            .firstOrFail()

        if (user.role !== 'admin' && property.createdBy !== user.id) {
            return response.unauthorized({
                error: i18n.t('messages.auth.unauthorized'),
            })
        }

        await property.softDelete()
        await PropertyService.audit('property: delete', user.id, property.id, null)

        await propertyQueue.add(
            'cleanupPropertyImages',
            { propertyId: property.id },
            { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
        )

        return {
            success: true,
            // message: 'Property Deleted Successfully',
            message: i18n.t('messages.property.deleted_success'),
        }
    }

    async assignAgent({ auth, request, params, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: propertyIdParamSchema, data: params })

        const { agentId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    agentId: vine.string().uuid(),
                })
            )
        )

        if (user.role !== 'admin') {
            return response.unauthorized({
                error: i18n.t('messages.auth.unauthorized'),
            })
        }

        const property = await Property.query()
            .where('id', id)
            .whereNull('deleted_at')
            .firstOrFail()

        property.assignedAgentId = agentId
        await property.save()

        await PropertyService.audit('property: assign_agent', user.id, property.id, { agentId })

        return {
            success: true,
            // message: 'Agent Assigned',
            message: i18n.t('messages.property.agent_assigned'),
            property,
        }
    }

    async export({ auth, request, response }: HttpContext) {
        const user = await auth.getUserOrFail()

        const filters = request.qs()
        const rawLimit = Number(filters.limit) || 10
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)

        const query = PropertyService.buildVisiblePropertiesQuery(user)
            .leftJoin('wards', 'wards.id', 'properties.ward_id')
            .select([
                'properties.id',
                'properties.name',
                'properties.slug',
                'properties.status',
                'properties.rent_amount',
                'properties.management_fee',
                'properties.security_deposit',
                'properties.key_money',
                'properties.other_initial_costs',
                'properties.view_count',
                'properties.created_at',
                'wards.name as ward_name',
            ])
            .orderBy('properties.created_at', 'desc')
            .limit(limit)

        const rows = await query

        const payload = {
            meta: {
                limit,
                next_page: rows.length === limit,
            },
            data: rows,
        }

        const fileName = `properties-${Date.now()}.json`
        const dirPath = app.makePath('tmp')

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
        }

        const filePath = app.makePath('tmp', fileName)
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))

        return response.download(filePath)
    }

    async exportCsv({ auth, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const query = PropertyService.buildVisiblePropertiesQuery(user)
            .preload('ward')
            .preload('creator')
            .preload('assignedAgent')

        response.header('Content-Type', 'text/csv')
        response.header(
            'Content-Disposition',
            `attachment; filename="properties-${Date.now()}.csv"`
        )
        response.header('Cache-Control', 'no-store')

        const stream = response.response

        stream.write(i18n.t('messages.csv.properties_headers') + '\n')

        const MAX_EXPORT_ROWS = Number(process.env.MAX_CSV_EXPORT_ROWS) || 10000
        const batchSize = 200
        let offset = 0
        let exported = 0

        while (exported < MAX_EXPORT_ROWS) {
            const properties = await query
                .clone()
                .limit(Math.min(batchSize, MAX_EXPORT_ROWS - exported))
                .offset(offset)

            if (properties.length === 0) break

            for (const property of properties) {
                const row = [
                    property.id,
                    FavoriteService.escapeCSV(property.name),
                    property.slug,
                    property.status,
                    FormatService.currency(property.rentAmount, i18n.locale, currency),
                    FavoriteService.escapeCSV(property.address ?? ''),
                    FavoriteService.escapeCSV(property.ward?.name ?? ''),
                    FavoriteService.escapeCSV(property.creator?.username ?? ''),
                    FavoriteService.escapeCSV(property.assignedAgent?.username ?? ''),
                    FormatService.number(property.viewCount, i18n.locale),
                    FormatService.date(property.createdAt.toJSDate(), i18n.locale),
                ]

                stream.write(row.join(',') + '\n')
            }

            exported += properties.length
            if (properties.length < batchSize) break
            offset += batchSize
        }

        stream.end()
    }

    async getMatchingSavedSearches({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: propertyIdParamSchema, data: params })
        const property = await Property.query()
            .where('id', id)
            .whereNull('deleted_at')
            .firstOrFail()

        if (!property.wardId) {
            return {
                success: true,
                data: {
                    matching_saved_searches: 0,
                    estimated_reach: 0,
                },
            }
        }

        const allSearches = await SavedSearch.query().whereRaw(
            'JSON_EXTRACT(filters, "$.ward_id") = ? OR JSON_CONTAINS(JSON_EXTRACT(filters, "$.ward_id"), ?)',
            [property.wardId, JSON.stringify(property.wardId)]
        )

        const matches = allSearches.filter((search) => {
            const filters = search.filters || {}

            // Ward check (scalar or array)
            const wardMatch = (() => {
                const w = filters.ward_id
                if (!w) return true
                if (Array.isArray(w)) return w.includes(property.wardId)
                return w === property.wardId
            })()

            if (!wardMatch) return false

            // Rent range check
            if (filters.minRent && property.rentAmount < filters.minRent) return false
            if (filters.maxRent && property.rentAmount > filters.maxRent) return false

            // Layout check
            if (filters.layout) {
                const layouts = Array.isArray(filters.layout) ? filters.layout : [filters.layout]
                if (property.layout && !layouts.includes(property.layout)) return false
            }

            // Bedrooms check
            if (filters.bedRooms && property.bedRooms && property.bedRooms < filters.bedRooms) {
                return false
            }

            return true
        })

        return {
            success: true,
            data: {
                matching_saved_searches: matches.length,
                estimated_reach: matches.length,
            },
        }
    }

    async upload({ auth, request, params, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: propertyIdParamSchema, data: params })
        const { featureImage, otherImages } = await request.validateUsing(
            vine.compile(
                vine.object({
                    featureImage: vine
                        .file({
                            size: '5mb',
                            extnames: ['jpg', 'jpeg', 'png'],
                        })
                        .optional(),

                    otherImages: vine
                        .array(
                            vine.file({
                                size: '5mb',
                                extnames: ['jpg', 'png', 'jpeg'],
                            })
                        )
                        .maxLength(10)
                        .optional(),
                })
            )
        )

        try {
            const result = await PropertyService.handleImage(id, user, featureImage, otherImages)
            return {
                success: true,
                message: i18n.t('messages.property.image_uploaded'),
                result,
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'Unauthorized') {
                return response.unauthorized({
                    error: i18n.t('messages.auth.unauthorized'),
                })
            }
            throw err
        }
    }

    async deleteImage({ auth, params, response, i18n, request }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id, index } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                    index: vine.number().min(0),
                })
            ),
            { data: { ...params, index: Number(params.index) } }
        )

        try {
            const property = await Property.query()
                .where('id', id)
                .whereNull('deleted_at')
                .firstOrFail()

            // // 👉 ADD HERE
            // console.log({
            //     userId: user.id,
            //     role: user.role,
            //     createdBy: property.createdBy,
            //     assignedAgentId: property.assignedAgentId,
            // })

            if (
                user.role !== 'admin' &&
                property.createdBy !== user.id &&
                property.assignedAgentId !== user.id
            ) {
                return response.unauthorized({
                    error: i18n.t('messages.auth.unauthorized'),
                })
            }

            const images = Array.isArray(property.otherImages)
                ? property.otherImages.filter((img) => typeof img === 'string')
                : []

            if (index < 0 || index >= images.length) {
                return response.badRequest({
                    error: i18n.t('messages.property.invalid_image_index'),
                })
            }

            const [removed] = images.splice(index, 1)

            if (removed) {
                const relativePath = removed.startsWith('/') ? removed.slice(1) : removed
                const absolutePath = app.makePath(relativePath)
                try {
                    if (fs.existsSync(absolutePath)) {
                        fs.unlinkSync(absolutePath)
                    }
                } catch (error) {
                    // Ignore file system errors to avoid blocking DB updates
                }
            }

            property.otherImages = images
            await property.save()

            return {
                success: true,
                message: i18n.t('messages.property.image_deleted'),
                data: {
                    other_images: images,
                },
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'E_ROW_NOT_FOUND') {
                return response.notFound({
                    error: i18n.t('messages.property.not_found'),
                })
            }
            throw err
        }
    }

    async reorderImages({ auth, params, request, response, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )

        const { order } = await request.validateUsing(
            vine.compile(
                vine.object({
                    order: vine.array(vine.string()).minLength(0),
                })
            )
        )

        try {
            const property = await Property.query()
                .where('id', id)
                .whereNull('deleted_at')
                .firstOrFail()

            if (
                user.role !== 'admin' &&
                property.createdBy !== user.id &&
                property.assignedAgentId !== user.id
            ) {
                return response.unauthorized({
                    error: i18n.t('messages.auth.unauthorized'),
                })
            }

            const currentImages = Array.isArray(property.otherImages)
                ? property.otherImages.filter((img) => typeof img === 'string')
                : []

            if (currentImages.length !== order.length) {
                return response.badRequest({
                    error: i18n.t('messages.property.invalid_image_order'),
                })
            }

            const currentSet = new Set(currentImages)
            const orderSet = new Set(order)

            if (
                currentSet.size !== orderSet.size ||
                currentImages.some((img) => !orderSet.has(img))
            ) {
                return response.badRequest({
                    error: i18n.t('messages.property.invalid_image_order'),
                })
            }

            property.otherImages = order
            await property.save()

            return {
                success: true,
                message: i18n.t('messages.property.images_reordered'),
                data: {
                    other_images: order,
                },
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'E_ROW_NOT_FOUND') {
                return response.notFound({
                    error: i18n.t('messages.property.not_found'),
                })
            }
            throw err
        }
    }
}
