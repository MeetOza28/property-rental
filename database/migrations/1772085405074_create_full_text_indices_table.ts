import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'properties'

    public async up() {
        try {
            await this.schema.raw(`
        ALTER TABLE ${this.tableName}
        DROP INDEX properties_fulltext_idx
      `)
        } catch {}

        await this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD FULLTEXT properties_fulltext_idx (name, description, address)
    `)
    }

    public async down() {
        try {
            await this.schema.raw(`
        ALTER TABLE ${this.tableName}
        DROP INDEX properties_fulltext_idx
      `)
        } catch {}

        await this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD FULLTEXT properties_fulltext_idx (name, description)
    `)
    }
}
