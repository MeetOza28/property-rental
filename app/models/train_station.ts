import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Property from './property.js'
import TrainLine from './train_line.js'

// import { GeoSearchMixin } from './src/geo_mixin.js'
import { GeoSearchMixin } from '@meetoza28/adonis-geo-search'

export default class TrainStation extends GeoSearchMixin(BaseModel) {
    @column({ isPrimary: true })
    declare id: string

    @column()
    declare name: string

    @column()
    declare latitude: number | null

    @column()
    declare longitude: number | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @manyToMany(() => TrainLine, {
        pivotTable: 'station_lines',
    })
    declare lines: ManyToMany<typeof TrainLine>

    @manyToMany(() => Property, {
        pivotTable: 'property_train_stations',
    })
    declare properties: ManyToMany<typeof Property>
}
