import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PropertyTrainStation extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'property_id' })
    declare propertyId: string

    @column({ columnName: 'station_id' })
    declare stationId: string

    @column({ columnName: 'walking_minutes' })
    declare walkingMinutes: number | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
