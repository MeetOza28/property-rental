import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Property from './property.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Ward extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare name: string

    @column()
    declare prefecture: string

    @column({
        prepare: (value) => JSON.stringify(value),
        consume: (value) => {
            if (!value) return []

            if (Array.isArray(value)) return value // ✅ Already parsed

            if (typeof value === 'string') {
                try {
                    return JSON.parse(value)
                } catch {
                    return []
                }
            }

            return []
        },
    })
    declare districts: string[] | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @hasMany(() => Property)
    declare properties: HasMany<typeof Property>
}
