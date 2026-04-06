import Property from '#models/property'
import AuditLog from '#models/audit_log'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs'
import { cuid } from '@adonisjs/core/helpers'
import { randomUUID } from 'node:crypto'
import type { MultipartFile } from '@adonisjs/core/bodyparser'

export class PropertyService {
    static uploadPath = app.makePath('uploads/properties')

    static async audit(action: string, userId: string, entityId: string, payload: any) {
        await AuditLog.create({
            id: randomUUID(),
            action,
            userId,
            entityType: 'property',
            entityId,
            newValues: payload ? JSON.stringify(payload) : null,
        })
    }

    static buildVisiblePropertiesQuery(user: any) {
        const query = Property.query().whereNull('properties.deleted_at')

        if (user.role === 'public') {
            query.where('properties.status', 'published')
        }

        if (user.role === 'agent') {
            query.where((sub) => {
                sub.where('properties.assigned_agent_id', user.id)
                sub.orWhere('properties.created_by', user.id)
            })
        }

        return query
    }

    static async handleImage(
        propertyId: string,
        user: any,
        featureImage?: MultipartFile,
        otherImages?: MultipartFile[]
    ) {
        const property = await Property.query()
            .where('id', propertyId)
            .whereNull('deleted_at')
            .firstOrFail()

        if (user.role !== 'admin' && property.createdBy !== user.id) {
            throw new Error('Unauthorized')
        }

        if (!fs.existsSync(PropertyService.uploadPath)) {
            fs.mkdirSync(PropertyService.uploadPath, { recursive: true })
        }

        // let featureImageName = property.featureImage
        // let otherImagesNames = property.otherImages ?? []

        let featureImageName = property.featureImage
        let otherImagesNames: string[] = []

        if (Array.isArray(property.otherImages)) {
            otherImagesNames = property.otherImages.filter((img) => typeof img === 'string')
        }

        // if (Array.isArray(property.otherImages)) {
        //   otherImagesNames = property.otherImages
        // }

        if (featureImage) {
            const fileName = `${cuid()}.${featureImage.extname}`

            await featureImage.move(PropertyService.uploadPath, { name: fileName })

            featureImageName = `/uploads/properties/${fileName}`
        }

        if (otherImages && otherImages.length) {
            for (const image of otherImages) {
                const fileName = `${cuid()}.${image.extname}`

                await image.move(PropertyService.uploadPath, { name: fileName })

                otherImagesNames.push(`/uploads/properties/${fileName}`)
            }
        }

        property.featureImage = featureImageName
        // property.otherImages = [...otherImagesNames]
        property.otherImages = otherImagesNames

        await property.save()

        return {
            feature_image: featureImageName,
            other_images: otherImagesNames,
        }
    }
}
