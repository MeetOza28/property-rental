// start/search.ts
import Property from '#models/property'
import TrainStation from '#models/train_station'
import app from '@adonisjs/core/services/app'
import { PropertySearch } from '@meetoza28/adonis-geo-search'

app.booted(() => {
    console.log('Property booted:', (Property as any).booted)
    PropertySearch.configure({
        PropertyModel: Property,
        TrainStationModel: TrainStation,

        // Optional overrides (these are the defaults):
        latColumn: 'latitude',
        lngColumn: 'longitude',
        softDeleteColumn: 'deleted_at',
        statusColumn: 'status',
        publishedValue: 'published',
        tableName: 'properties',
    })
})
