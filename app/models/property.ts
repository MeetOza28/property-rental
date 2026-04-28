import { DateTime } from 'luxon'
import {
    BaseModel,
    beforeCreate,
    belongsTo,
    column,
    computed,
    hasMany,
    manyToMany,
} from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
// import slugify from 'slugify'
import Ward from './ward.js'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import TrainStation from './train_station.js'
import string from '@adonisjs/core/helpers/string'
import PropertyFavorite from './property_favorite.js'
import PropertyView from './property_view.js'
import PropertyReview from './property_review.js'
import { GeoSearchMixin } from '@meetoza28/adonis-geo-search'
// import { slugify } from '@adonisjs/lucid-slugify'

export default class Property extends GeoSearchMixin(BaseModel) {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare name: string

    @column()
    declare slug: string

    @column()
    declare status: 'draft' | 'published' | 'archived'

    @column()
    declare address: string | null

    @column()
    declare description: string | null

    @column()
    declare latitude: number | null

    @column()
    declare longitude: number | null

    @column()
    declare layout: string | null

    @column({ columnName: 'bed_rooms' })
    declare bedRooms: number | null

    @column({ columnName: 'room_number' })
    declare roomNumber: string | null

    @column({ columnName: 'size_sqm' })
    declare sizeSqm: number | null

    @column.date({ columnName: 'build_date' })
    declare buildDate: DateTime | null

    @column()
    declare age: number | null

    @column()
    declare floor: number | null

    @column()
    declare structure: 'apartment' | 'mansion' | 'house' | null

    @column({ columnName: 'feature_image' })
    declare featureImage: string | null

    @column({
        columnName: 'other_images',
        prepare: (value: any[]) => JSON.stringify(value),
        consume: (value: any) => {
            if (!value) return []
            if (Array.isArray(value)) return value
            if (typeof value === 'string') return JSON.parse(value)
            return []
        },
    })
    declare otherImages: string[] | null

    @column({ columnName: 'rent_amount' })
    declare rentAmount: number

    @column({ columnName: 'management_fee' })
    declare managementFee: number

    @column({ columnName: 'security_deposit' })
    declare securityDeposit: number

    @column({ columnName: 'guarantor_fee' })
    declare guarantorFee: number

    @column({ columnName: 'agency_fee' })
    declare agencyFee: number

    // Tests/controllers use the misspelled name `insurenceFee`,
    // but your migrations rename the DB column to `insurance_fee`.
    @column({ columnName: 'insurance_fee' })
    declare insurenceFee: number

    @column({ columnName: 'key_money' })
    declare keyMoney: number

    @column({ columnName: 'other_initial_costs' })
    declare otherInitialCosts: number

    @column({ columnName: 'guarantor_company' })
    declare guarantorCompany: string | null

    // Tests/controllers use the misspelled name `fireInsurence`,
    // but your migrations rename the DB column to `fire_insurance`.
    @column({ columnName: 'fire_insurance' })
    declare fireInsurence: string | null

    @column({
        columnName: 'features',
        prepare: (value: any[]) => JSON.stringify(value),
        consume: (value: any) => {
            if (!value) return []
            if (Array.isArray(value)) return value
            if (typeof value === 'string') return JSON.parse(value)
            return []
        },
    })
    declare features: string[] | null

    @column({ columnName: 'ward_id' })
    declare wardId: string | null

    @column({ columnName: 'created_by' })
    declare createdBy: string

    @column({ columnName: 'assigned_agent_id' })
    declare assignedAgentId: string | null

    @column({ columnName: 'view_count' })
    declare viewCount: number

    @column.dateTime({ columnName: 'deleted_at' })
    declare deletedAt: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column()
    declare favoritesCount: number

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
    static related: any

    @beforeCreate()
    static async generateSlug(property: Property) {
        if (!property.slug) {
            const baseSlug = string.slug(property.name, { lower: true, strict: true })

            let slug: string
            let exists = true

            while (exists) {
                const suffix = randomUUID().slice(0, 5)
                slug = `${baseSlug}-${suffix}`

                const found = await Property.query().where('slug', slug).first()
                exists = !!found
            }

            property.slug = slug!
        }
    }

    @belongsTo(() => Ward)
    declare ward: BelongsTo<typeof Ward>

    @belongsTo(() => User, { foreignKey: 'createdBy' })
    declare creator: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'assignedAgentId' })
    declare assignedAgent: BelongsTo<typeof User>

    @hasMany(() => PropertyFavorite, { foreignKey: 'propertyId' })
    declare favorites: HasMany<typeof PropertyFavorite>

    @hasMany(() => PropertyView, { foreignKey: 'propertyId' })
    declare views: HasMany<typeof PropertyView>

    @hasMany(() => PropertyReview)
    declare reviews: HasMany<typeof PropertyReview>

    @manyToMany(() => TrainStation, {
        pivotTable: 'property_train_stations',

        pivotForeignKey: 'property_id',
        pivotRelatedForeignKey: 'station_id',
        pivotColumns: ['walking_minutes'],
    })
    declare stations: ManyToMany<typeof TrainStation>

    @computed()
    get totalMonthlyCost() {
        return Number(this.rentAmount) + Number(this.managementFee)
    }

    @computed()
    get totalInitialCost() {
        return Number(this.securityDeposit) + Number(this.keyMoney) + Number(this.otherInitialCosts)
    }

    async incrementViewCount() {
        this.viewCount++
        await this.save()
    }

    @beforeCreate()
    static assignId(model: Property) {
        model.id = randomUUID()
    }

    async softDelete() {
        this.deletedAt = DateTime.now()
        await this.save()
    }

    async restore() {
        this.deletedAt = null
        await this.save()
    }

    getTranslation() {
        return {
            name: this[`name`] ?? this.name,
            description: this[`description`] ?? this.description,
        }
    }
}
