// #controllers/dashboard_inquiries_controller.ts
import Inquiry from '#models/inquiry'
import InquiryMessage from '#models/inquiry_message'
import Property from '#models/property'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { emailQueue } from '#queues/redis'
import vine from '@vinejs/vine'
import { FormatService } from '#services/format_service'

export default class DashboardInquiriesController {
    async index({ auth, request, i18n }: HttpContext) {
        const user = auth.user!
        const filters = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().optional(),
                    limit: vine.number().optional(),
                    status: vine
                        .enum(['pending', 'in_progress', 'responded', 'closed', 'spam'])
                        .optional(),
                })
            ),
            { data: request.qs() }
        )

        const rawPage = Number(filters.page) || 1
        const rawLimit = Number(filters.limit) || 10
        const page = rawPage > 0 ? rawPage : 1
        const limit = Math.min(rawLimit > 0 ? rawLimit : 10, 100)
        const offset = (page - 1) * limit

        const query = Inquiry.query()
            .select(['id', 'property_id', 'status', 'assigned_to', 'created_at'])
            .if(user.role === 'agent', (q) => {
                q.where((agentScope) => {
                    agentScope
                        .where('assigned_to', user.id)
                        .orWhereIn(
                            'property_id',
                            Property.query().select('id').where('created_by', user.id)
                        )
                })
            })
            .if(Boolean(filters.status), (q) => q.where('status', filters.status as string))

        const rows = await query.limit(limit).offset(offset)

        const data = rows.map((row) => ({
            id: row.id,
            property_id: row.propertyId,
            status: i18n.t(`messages.status.${row.status}`),
            assigned_to: row.assignedTo,
            created_at: FormatService.date(row.createdAt, i18n.locale),
        }))

        return {
            success: true,
            message: i18n.t('messages.common.success'),
            data,
            meta: { page, limit },
        }
    }

    async show({ params, auth, request, i18n }: HttpContext) {
        const user = auth.user!

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )

        const inquiry = await Inquiry.query()
            .select(['id', 'status', 'assigned_to'])
            .where('id', id)
            .if(user.role === 'agent', (q) => {
                q.where((agentScope) => {
                    agentScope
                        .where('assigned_to', user.id)
                        .orWhereIn(
                            'property_id',
                            Property.query().select('id').where('created_by', user.id)
                        )
                })
            })
            .firstOrFail()

        const messages = await InquiryMessage.query()
            .select(['id', 'message', 'sender_type', 'sender_id', 'created_at'])
            .where('inquiry_id', id)
            .orderBy('created_at', 'desc')
            .limit(50)

        return {
            success: true,
            message: i18n.t('messages.common.success'),
            data: {
                inquiry: {
                    id: inquiry.id,
                    status: i18n.t(`messages.status.${inquiry.status}`),
                    assigned_to: inquiry.assignedTo,
                },
                messages: messages.map((msg) => ({
                    id: msg.id,
                    message: msg.message,
                    sender_type: msg.senderType,
                    sender_id: msg.senderId,
                    created_at: FormatService.date(msg.createdAt, i18n.locale),
                })),
            },
        }
    }

    async updateStatus({ params, request, i18n }: HttpContext) {
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    status: vine.enum(['pending', 'in_progress', 'responded', 'closed', 'spam']),
                })
            )
        )

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )

        const inquiry = await Inquiry.query()
            .select(['id', 'status', 'responded_at'])
            .where('id', id)
            .firstOrFail()

        inquiry.status = payload.status

        if (payload.status === 'responded') {
            inquiry.respondedAt = DateTime.now()
        }

        await inquiry.save()

        return {
            success: true,
            message: i18n.t('messages.inquiry.status_updated'),
        }
    }

    async addMessage({ params, request, auth, i18n }: HttpContext) {
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

        const recent = await InquiryMessage.query()
            .where('inquiry_id', id)
            .if(auth.user, (q) => q.where('sender_id', auth.user!.id))
            .if(!auth.user, (q) => q.whereNull('sender_id'))
            .where('created_at', '>', DateTime.now().minus({ seconds: 10 }).toSQL())
            .first()

        if (recent) {
            return {
                error: i18n.t('messages.inquiry.too_many_messages'),
            }
        }

        const msg = await InquiryMessage.create({
            id: randomUUID(),
            inquiryId: id,
            senderId: auth.user!.id,
            senderType: 'agent',
            message: payload.message,
            attachments: payload.attachments ?? null,
            isRead: false,
        })

        const inquiry = await Inquiry.query()
            .select(['id', 'email'])
            .where('id', id)
            .if(auth.user && auth.user.role === 'agent', (q) => {
                q.where('assigned_to', auth.user!.id)
            })
            .firstOrFail()

        await emailQueue.add('sendInquiryResponseEmail', {
            user: {
                email: inquiry.email,
            },
            inquiry: {
                id: inquiry.id,
            },
            msg: payload.message,
        })

        return {
            success: true,
            data: msg,
        }
    }

    async assign({ params, request, i18n }: HttpContext) {
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    agentId: vine.string().uuid(),
                })
            )
        )

        const { id } = await request.validateUsing(
            vine.compile(
                vine.object({
                    id: vine.string().uuid(),
                })
            ),
            { data: params }
        )

        const inquiry = await Inquiry.query()
            .select(['id', 'assigned_to'])
            .where('id', id)
            .firstOrFail()

        inquiry.assignedTo = payload.agentId

        await inquiry.save()

        return {
            success: true,
            message: i18n.t('messages.inquiry.inquiry_assigned'),
        }
    }
}
