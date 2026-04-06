import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Property from './property.js'

export default class UserSearchHistory extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string | null

    @column({ columnName: 'session_id' })
    declare sessionId: string | null

    @column({ columnName: 'search_query' })
    declare searchQuery: string | null

    @column({
        prepare: (value) => JSON.stringify(value),
        consume: (value) => (value ? JSON.parse(value) : null),
    })
    declare filters: any | null

    @column({ columnName: 'results_count' })
    declare resultsCount: number | null

    @column({ columnName: 'clicked_property_id' })
    declare clickedPropertyId: string | null

    @column.dateTime({ columnName: 'searched_at' })
    declare searchedAt: DateTime

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    @belongsTo(() => Property, { foreignKey: 'clickedPropertyId' })
    declare clickedProperty: BelongsTo<typeof Property>

    static recent = scope((query, days: number) => {
        query.where('searched_at', '>', DateTime.now().minus({ days }).toSQL())
    })
}
