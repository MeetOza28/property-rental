import User from '#models/user'
import type { AccessToken } from '@adonisjs/auth/access_tokens'

export type TokenPair = {
    accessToken: AccessToken
    refreshToken: AccessToken
}

export class TokenService {
    /**
     * Issue a short-lived access token and a long-lived refresh token for a user
     */
    static async issue(user: InstanceType<typeof User>): Promise<TokenPair> {
        const [accessToken, refreshToken] = await Promise.all([
            User.accessTokens.create(user),
            User.refreshTokens.create(user),
        ])

        return { accessToken, refreshToken }
    }

    static serialize({ accessToken, refreshToken }: TokenPair) {
        return {
            accessToken: accessToken.toJSON(),
            refreshToken: refreshToken.toJSON(),
        }
    }
}
