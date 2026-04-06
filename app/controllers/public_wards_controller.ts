import TrainStation from '#models/train_station'
import Ward from '#models/ward'
import Property from '#models/property'
import PropertyFavorite from '#models/property_favorite'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { FormatService } from '#services/format_service'

export default class PublicWardsController {
    async wards({ i18n }: HttpContext) {
        const wards = await Ward.query().select([
            'id',
            'name',
            'prefecture',
            'districts',
            'createdAt',
        ])
        const data = wards.map((ward) => ({
            id: ward.id,
            name: ward.name,
            prefecture: ward.prefecture,
            districts: ward.districts,
            created_at: FormatService.date(ward.createdAt, i18n.locale),
        }))
        return { success: true, data }
    }

    async wardById({ request, params, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        // const { id } = await vine.validate({ schema: uuidParamSchema, data: params })
        const ward = await Ward.findOrFail(id)
        const data = {
            id: ward.id,
            name: ward.name,
            prefecture: ward.prefecture,
            districts: ward.districts,
            created_at: FormatService.date(ward.createdAt, i18n.locale),
            updated_at: FormatService.date(ward.updatedAt, i18n.locale),
        }
        return { success: true, data }
    }

    async wardDistricts({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const ward = await Ward.findOrFail(id)

        const wardDistrict = ward.districts

        return { success: true, data: wardDistrict }
    }

    async trainStations({}: HttpContext) {
        const stations = await TrainStation.query().select(['id', 'name'])
        return { success: true, data: stations }
    }

    async trainStationById({ request, params }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )
        const station = await TrainStation.findOrFail(id)
        return { success: true, data: station }
    }

    async searchProperties({ request, i18n }: HttpContext) {
        const currency = request.header('Accept-Currency') ?? 'JPY'
        const { q } = await request.validateUsing(
            vine.compile(
                vine.object({
                    q: vine.string().trim().minLength(1),
                })
            )
        )
        const propertyModel = Property.query()
            .whereNull('deleted_at')
            .where('status', 'published')
            .preload('ward')

        const filters = request.qs()

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        if (q) {
            propertyModel.whereRaw(
                'MATCH(name, description, address) AGAINST (? IN NATURAL LANGUAGE MODE)',
                [q]
            )
        }
        // const properties = await query.limit(50)

        const rows = await propertyModel.offset(offset).limit(limit)

        const properties = rows.map((property) => ({
            id: property.id,
            name: property.name,
            slug: property.slug,
            status: property.status,

            rent_amount: FormatService.currency(property.rentAmount, i18n.locale, currency),
            management_fee: FormatService.currency(
                property.managementFee ?? 0,
                i18n.locale,
                currency
            ),
            security_deposit: FormatService.currency(
                property.securityDeposit ?? 0,
                i18n.locale,
                currency
            ),
            key_money: FormatService.currency(property.keyMoney ?? 0, i18n.locale, currency),
            other_initial_costs: FormatService.currency(
                property.otherInitialCosts ?? 0,
                i18n.locale,
                currency
            ),

            totalMonthlyCost: FormatService.currency(
                property.totalMonthlyCost,
                i18n.locale,
                currency
            ),
            totalInitialCost: FormatService.currency(
                property.totalInitialCost,
                i18n.locale,
                currency
            ),

            view_count: FormatService.number(property.viewCount, i18n.locale),

            ward: property.ward
                ? {
                      id: property.ward.id,
                      name: property.ward.name,
                  }
                : null,

            created_at: FormatService.date(property.createdAt.toJSDate(), i18n.locale),
        }))

        return {
            success: true,
            data: properties,
        }
    }

    async similarProperties({ request, params, i18n }: HttpContext) {
        const currency = request.header('Accept-Currency') ?? 'JPY'
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
            .whereNull('deleted_at')
            .firstOrFail()

        if (!property.wardId) {
            return { success: true, data: [] }
        }

        const propertyModal = await Property.query()
            .whereNull('deleted_at')
            .where('status', 'published')
            .where('ward_id', property.wardId)
            .whereNot('id', id)
            .limit(6)

        const rows = propertyModal

        // eslint-disable-next-line @typescript-eslint/no-shadow
        const properties = rows.map((property) => ({
            id: property.id,
            name: property.name,
            slug: property.slug,
            status: property.status,

            rent_amount: FormatService.currency(property.rentAmount, i18n.locale, currency),
            management_fee: FormatService.currency(
                property.managementFee ?? 0,
                i18n.locale,
                currency
            ),
            security_deposit: FormatService.currency(
                property.securityDeposit ?? 0,
                i18n.locale,
                currency
            ),
            key_money: FormatService.currency(property.keyMoney ?? 0, i18n.locale, currency),
            other_initial_costs: FormatService.currency(
                property.otherInitialCosts ?? 0,
                i18n.locale,
                currency
            ),

            totalMonthlyCost: FormatService.currency(
                property.totalMonthlyCost,
                i18n.locale,
                currency
            ),
            totalInitialCost: FormatService.currency(
                property.totalInitialCost,
                i18n.locale,
                currency
            ),

            view_count: FormatService.number(property.viewCount, i18n.locale),

            ward: property.ward
                ? {
                      id: property.ward.id,
                      name: property.ward.name,
                  }
                : null,

            created_at: FormatService.date(property.createdAt.toJSDate(), i18n.locale),
        }))

        return {
            success: true,
            data: properties,
        }
    }

    async features({}: HttpContext) {
        const result = await Property.query()
            .whereNull('deleted_at')
            .whereNotNull('features')
            .distinct('features')
            .limit(500)

        const features = new Set<string>()

        result.forEach((row) => {
            const list = row.features ?? []
            list.forEach((f: string) => features.add(f))
        })

        return {
            success: true,
            data: Array.from(features),
        }
    }

    async favoriteCount({}: HttpContext) {
        const result = await PropertyFavorite.query()
            .whereHas('property', (q) => q.whereNull('deleted_at'))
            .count('* as total')
        const count = result[0].$extras.total

        return {
            success: true,
            count,
        }
    }
}
