import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    async up() {
        const exists = await this.schema.hasTable(this.tableName)

        // IMPORTANT: await table creation so subsequent raw queries (fulltext/check)
        // don't run before the table exists.
        if (!exists) {
            await this.schema.createTable(this.tableName, (table) => {
                table.uuid('id').primary()
                table.string('name').notNullable()
                table.string('slug').notNullable().unique()
                table
                    .enu('status', ['draft', 'published', 'archived'])
                    .notNullable()
                    .defaultTo('draft')
                table.text('address').nullable()
                table.decimal('latitude', 10, 7).nullable()
                table.decimal('longitude', 10, 7).nullable()
                table.text('description').nullable()
                table.string('layout').nullable()
                table.integer('bed_rooms').nullable()
                table.string('room_number').nullable()
                table.decimal('size_sqm', 8, 2).nullable()
                table.date('build_date').nullable()
                table.integer('age').nullable()
                table.integer('floor').nullable()
                table.enu('structure', ['apartment', 'mansion', 'house']).nullable()
                table.string('feature_image').nullable()
                table.json('other_images').nullable()
                table.decimal('rent_amount', 12, 2).notNullable()
                table.decimal('management_fee', 12, 2).defaultTo(0)
                table.decimal('security_deposit', 12, 2).defaultTo(0)
                table.decimal('guarantor_fee', 12, 2).defaultTo(0)
                table.decimal('agency_fee', 12, 2).defaultTo(0)
                table.decimal('insurence_fee', 12, 2).defaultTo(0)
                table.decimal('key_money', 12, 2).defaultTo(0)
                table.decimal('other_initial_costs', 12, 2).defaultTo(0)
                table.string('guarantor_company').nullable()
                table.string('fire_insurence').nullable()
                table.json('features').nullable()

                table.uuid('ward_id').references('id').inTable('wards').onDelete('SET NULL')
                table
                    .uuid('created_by')
                    .notNullable()
                    .references('id')
                    .inTable('users')
                    .onDelete('CASCADE')
                table
                    .uuid('assigned_agent_id')
                    .nullable()
                    .references('id')
                    .inTable('users')
                    .onDelete('SET NULL')
                table.integer('view_count').defaultTo(0)
                table.timestamp('created_at')
                table.timestamp('updated_at')
                table.timestamp('deleted_at').nullable()

                table.index(['status'])
                table.index(['ward_id'])
                table.index(['rent_amount'])
                table.index(['created_by'])
                table.index(['assigned_agent_id'])
                table.index(['created_at'])
                table.index(['view_count'])

                table.index(['status', 'ward_id'])
                table.index(['status', 'rent_amount'])
            })
        }

        // If the previous migration attempt partially created the table, the
        // fulltext index / check constraint might already exist.
        try {
            await this.db.rawQuery(`
                ALTER TABLE properties
                ADD FULLTEXT properties_fulltext_idx (name, description)
              `)
        } catch (error) {}

        try {
            await this.db.rawQuery(`
                ALTER TABLE properties
                ADD CONSTRAINT rent_amount_positive CHECK (rent_amount > 0)
              `)
        } catch (error) {}
    }

    async down() {
        try {
            await this.db.rawQuery(`
              ALTER TABLE properties DROP INDEX properties_fulltext_idx
            `)
        } catch (error) {}

        // CHECK constraint (optional safe drop)
        try {
            await this.db.rawQuery(`
            ALTER TABLE properties DROP CHECK rent_amount_positive
          `)
        } catch {}

        await this.schema.dropTable(this.tableName)
    }
}
