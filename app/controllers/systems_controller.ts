import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class SystemsController {
    async health({ i18n }: HttpContext) {
        await db.rawQuery('SELECT 1')

        return {
            status: i18n.t('messages.system.status_ok'),
            db: i18n.t('messages.system.db_connected'),
        }
    }

    async version({}: HttpContext) {
        return {
            version: '1.0.0',
        }
    }
}
