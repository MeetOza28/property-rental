import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * BUG FIX: `origin: true` (wildcard) combined with `credentials: true` is a
 * security misconfiguration. Set CORS_ORIGIN in your environment to a
 * comma-separated list of allowed origins, e.g.:
 *   CORS_ORIGIN=https://app.example.com,https://admin.example.com
 *
 * In development, CORS_ORIGIN=http://localhost:3000 is fine.
 */
const allowedOrigins = env
    .get('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean)

const corsConfig = defineConfig({
    enabled: true,
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    headers: true,
    exposeHeaders: [],
    credentials: true,
    maxAge: 90,
})

export default corsConfig
