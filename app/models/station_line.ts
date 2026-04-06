import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class StationLine extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column({ columnName: 'station_id' })
    declare stationId: string

    @column({ columnName: 'line_id' })
    declare lineId: string

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
