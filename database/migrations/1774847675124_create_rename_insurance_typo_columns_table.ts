import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * BUG FIX: rename typo columns insurence_fee -> insurance_fee
 * and fire_insurence -> fire_insurance in the properties table.
 *
 * Run: node ace migration:run
 */
export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.renameColumn('insurence_fee', 'insurance_fee')
            table.renameColumn('fire_insurence', 'fire_insurance')
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.renameColumn('insurance_fee', 'insurence_fee')
            table.renameColumn('fire_insurance', 'fire_insurence')
        })
    }
}
