import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SavedSearch extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'user_id' })
    declare userId: string

    @column()
    declare name: string

    @column({
        prepare: (value) => JSON.stringify(value),
        consume: (value) => {
            if (!value) return null
            if (typeof value === 'object') return value
            return JSON.parse(value)
        },
    })
    declare filters: any

    @column({ columnName: 'email_alerts_enabled' })
    declare emailAlertsEnabled: boolean

    @column({ columnName: 'alert_frequency' })
    declare alertFrequency: 'instant' | 'daily' | 'weekly'

    @column.dateTime({ columnName: 'last_alert_sent_at' })
    declare lastAlertSentAt: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    static emailAlertsEnabled = scope((query) => {
        query.where('email_alerts_enabled', true)
    })

    static dueForAlerts = scope((query, frequency: 'instant' | 'daily' | 'weekly') => {
        query.where('alert_frequency', frequency)
    })

    matchesProperty(property: any) {
        if (this.filters.minRent && property.rentAmount < this.filters.minRent) {
            return false
        }
        return true
    }
}
