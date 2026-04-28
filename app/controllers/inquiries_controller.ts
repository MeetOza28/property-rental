// #controllers/inquiries_controller.ts
import { randomUUID } from 'node:crypto'
import Inquiry from '#models/inquiry'
import InquiryMessage from '#models/inquiry_message'
import Property from '#models/property'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { emailQueue } from '#queues/redis'
import User from '#models/user'
import { FormatService } from '#services/format_service'
import db from '@adonisjs/lucid/services/db'

export default class InquiriesController {
    async store({ request, auth, i18n, response }: HttpContext) {
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    propertyId: vine.string().uuid(),
                    name: vine.string().minLength(2),
                    email: vine.string().email(),
                    phone: vine.string().optional(),
                    message: vine.string().minLength(5),
                    preferredViewingDate: vine
                        .string()
                        .regex(/^\d{2}\/\d{2}\/\d{4}$/)
                        .optional(),
                })
            )
        )

        const preferredViewingDate = payload.preferredViewingDate
            ? DateTime.fromFormat(payload.preferredViewingDate, 'dd/MM/yyyy')
            : null

        if (preferredViewingDate && !preferredViewingDate.isValid) {
            return {
                error: i18n.t('messages.inquiry.invalid_date'),
            }
        }

        const property = await Property.query()
            .select(['id', 'name', 'assignedAgentId', 'createdBy'])
            .where('id', payload.propertyId)
            .whereNull('deleted_at')
            .where('status', 'published')
            .firstOrFail()

        const responsibleUserId = property.assignedAgentId || property.createdBy
        if (!responsibleUserId) {
            return response.unprocessableEntity({
                error: i18n.t('messages.inquiry.no_responsible_agent'),
            })
        }

        const agent = await User.query()
            .select(['id', 'email'])
            .where('id', responsibleUserId)
            .whereNull('deleted_at')
            .first()

        if (!agent) {
            return response.unprocessableEntity({
                error: i18n.t('messages.inquiry.agent_not_found'),
            })
        }

        const { inquiry } = await db.transaction(async (trx) => {
            const newInquiry = await Inquiry.create(
                {
                    id: randomUUID(),
                    propertyId: payload.propertyId,
                    userId: auth.user?.id ?? null,
                    name: payload.name,
                    email: payload.email,
                    phone: payload.phone,
                    message: payload.message,
                    preferredViewingDate,
                    status: 'pending',
                    assignedTo: responsibleUserId,
                    ipAddress: request.ip(),
                    userAgent: request.header('user-agent') || '',
                },
                { client: trx }
            )

            await InquiryMessage.create(
                {
                    id: randomUUID(),
                    inquiryId: newInquiry.id,
                    senderId: auth.user?.id ?? null,
                    senderType: 'user',
                    message: payload.message,
                    isRead: false,
                },
                { client: trx }
            )

            return { inquiry: newInquiry }
        })

        // Queue emails outside the transaction (non-critical side effects)
        await emailQueue.add('sendNewInquiryEmail', {
            agent: { id: agent.id, email: agent.email },
            inquiry: {
                id: inquiry.id,
                name: inquiry.name,
                email: inquiry.email,
                message: inquiry.message,
            },
            property: { name: property.name },
        })

        await emailQueue.add('sendInquiryConfirmationEmail', {
            email: inquiry.email,
            inquiry: { id: inquiry.id, name: inquiry.name },
            property: { name: property.name },
        })

        return {
            success: true,
            message: i18n.t('messages.inquiry.created'),
            inquiry_id: inquiry.id,
        }
    }

    async show({ params, request, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(vine.object({ id: vine.string().uuid() })),
            { data: params }
        )

        const inquiry = await Inquiry.query()
            .select([
                'id',
                'status',
                'name',
                'email',
                'created_at',
                'user_id',
                'assigned_to',
                'property_id',
            ])
            .where('id', id)
            .firstOrFail()

        return {
            success: true,
            message: i18n.t('messages.common.success'),
            data: {
                id: inquiry.id,
                status: i18n.t(`messages.status.${inquiry.status}`),
                name: inquiry.name,
                email: inquiry.email,
                created_at: FormatService.date(inquiry.createdAt, i18n.locale),
            },
        }
    }

    async addMessage({ params, request, auth, i18n, response }: HttpContext) {
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    message: vine.string().minLength(1),
                    attachments: vine.array(vine.string()).optional(),
                })
            )
        )

        const { id } = await request.validateUsing(
            vine.compile(vine.object({ id: vine.string().uuid() })),
            { data: params }
        )

        const inquiry = await Inquiry.query()
            .select(['id', 'assigned_to'])
            .where('id', id)
            .firstOrFail()

        const recent = await InquiryMessage.query()
            .where('inquiry_id', id)
            .if(auth.user, (q) => q.where('sender_id', auth.user!.id))
            .if(!auth.user, (q) => q.whereNull('sender_id'))
            .where('created_at', '>', DateTime.now().minus({ seconds: 10 }).toSQL())
            .first()

        if (recent) {
            return response.tooManyRequests({
                error: i18n.t('messages.inquiry.too_many_messages'),
            })
        }

        const msg = await InquiryMessage.create({
            id: randomUUID(),
            inquiryId: id,
            senderId: auth.user?.id ?? null,
            senderType: 'user', // or 'agent'
            message: payload.message,
            attachments: payload.attachments ?? null,
            isRead: false,
        })

        // if (!inquiry.assignedTo) {
        //     return {
        //         error: i18n.t('messages.inquiry.not_assigned'),
        //     }
        // }

        if (!inquiry.assignedTo) {
            // Message saved but no agent to notify – return success anyway
            return {
                success: true,
                message: i18n.t('messages.inquiry.message_sent'),
                data: msg,
            }
        }

        const agent = await User.query()
            .select(['id', 'email'])
            .where('id', inquiry.assignedTo)
            .whereNull('deleted_at')
            .first()

        if (agent) {
            await emailQueue.add('sendInquiryNewMessageEmail', {
                agent: { id: agent.id, email: agent.email },
                inquiry: { id: inquiry.id },
                msg: payload.message,
            })
        }

        return {
            success: true,
            message: i18n.t('messages.inquiry.message_sent'),
            data: msg,
        }
    }
}
