import PropertyFavorite from '#models/property_favorite'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
    async states({ auth, i18n }: HttpContext) {
        const user = await auth.getUserOrFail()

        const total = await PropertyFavorite.query()
            .where('user_id', user.id)
            .count('* as total')
            .firstOrFail()

        const totalFavorites = Number(total.$extras.total)

        return {
            success: true,
            message: i18n.t('messages.user.states_fetched'),
            data: {
                total_favorites: totalFavorites,
            },
        }
    }
}
