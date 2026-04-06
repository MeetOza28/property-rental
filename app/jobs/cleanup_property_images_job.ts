// import Property from '#models/property'
import fs from 'node:fs'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

export default class CleanupPropertyImagesJob {
    static readonly jobName = 'cleanupPropertyImages'

    async handle({ propertyId }: { propertyId: string }) {
        // FIX: AdonisJS Lucid has no .withTrashed().
        // Use a raw DB query to fetch the row even when deleted_at is set,
        // bypassing any global soft-delete scope.
        const row = await db
            .from('properties')
            .where('id', propertyId)
            .select(['id', 'feature_image', 'other_images'])
            .first()

        if (!row) {
            logger.warn({ propertyId }, 'cleanupPropertyImages: property not found')
            return
        }

        const toDelete: string[] = []

        if (row.feature_image) {
            toDelete.push(row.feature_image)
        }

        // other_images is stored as JSON string in DB
        const otherImages: string[] = (() => {
            if (!row.other_images) return []
            if (Array.isArray(row.other_images)) return row.other_images
            try {
                return JSON.parse(row.other_images)
            } catch {
                return []
            }
        })()

        toDelete.push(...otherImages)

        for (const relativePath of toDelete) {
            if (!relativePath) continue
            // relativePath is like /uploads/properties/filename.jpg
            const absolutePath = app.makePath(relativePath.replace(/^\//, ''))
            try {
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath)
                    logger.info({ absolutePath }, 'cleanupPropertyImages: deleted')
                }
            } catch (err) {
                logger.error({ err, absolutePath }, 'cleanupPropertyImages: failed to delete file')
            }
        }

        // Nullify image references so re-running the job is idempotent
        await db
            .from('properties')
            .where('id', propertyId)
            .update({ feature_image: null, other_images: JSON.stringify([]) })

        logger.info({ propertyId }, 'cleanupPropertyImages: done')
    }
}
