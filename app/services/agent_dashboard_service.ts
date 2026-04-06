import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export interface ViewsSummary {
    totalViews: number
    uniqueProperties: number
}

export default class AgentDashboardService {
    static async countViewsBetween(
        agentId: string,
        type: 'daily' | 'weekly' | 'monthly'
    ): Promise<ViewsSummary> {
        let condition = ''

        if (type === 'daily') {
            condition = 'pv.viewed_at >= CURDATE()'
        } else if (type === 'weekly') {
            condition = 'pv.viewed_at >= NOW() - INTERVAL 6 DAY'
        } else {
            condition = 'pv.viewed_at >= NOW() - INTERVAL 29 DAY'
        }

        const result = await db
            .from('property_views as pv')
            .join('properties as p', 'p.id', 'pv.property_id')
            .whereRaw(condition)
            .where((builder) => {
                builder.where('p.assigned_agent_id', agentId).orWhere('p.created_by', agentId)
            })
            .select(
                db.raw('COUNT(*) as total'),
                db.raw('COUNT(DISTINCT pv.property_id) as unique_properties')
            )
            .first()

        return {
            totalViews: Number(result?.total ?? 0),
            uniqueProperties: Number(result?.unique_properties ?? 0),
        }
    }

    static async countViewsCustomRange(
        agentId: string,
        start: DateTime,
        end: DateTime
    ): Promise<ViewsSummary> {
        const result = await db
            .from('property_views as pv')
            .join('properties as p', 'p.id', 'pv.property_id')
            .whereBetween('pv.viewed_at', [start.toJSDate(), end.toJSDate()])
            .where((builder) => {
                builder.where('p.assigned_agent_id', agentId).orWhere('p.created_by', agentId)
            })
            .select(
                db.raw('COUNT(*) as total'),
                db.raw('COUNT(DISTINCT pv.property_id) as unique_properties')
            )
            .first()

        return {
            totalViews: Number(result?.total ?? 0),
            uniqueProperties: Number(result?.unique_properties ?? 0),
        }
    }

    static calculateChange(current: number, previous: number) {
        const delta = current - previous
        const percent = previous === 0 ? null : (delta / previous) * 100

        return {
            current,
            previous,
            delta,
            percent,
        }
    }
}
