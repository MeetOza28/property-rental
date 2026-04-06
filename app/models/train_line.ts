import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import TrainStation from './train_station.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class TrainLine extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare name: string

    @column()
    declare operator: string | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @manyToMany(() => TrainStation, {
        pivotTable: 'station_lines',
    })
    declare stations: ManyToMany<typeof TrainStation>
}
