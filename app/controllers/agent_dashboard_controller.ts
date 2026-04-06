import AgentDashboardService from '#services/agent_dashboard_service'
import Property from '#models/property'
import PropertyView from '#models/property_view'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class AgentDashboardController {
    async analytics({ auth, response }: HttpContext) {
        const userId = auth.user?.id

        if (!userId) {
            return response.unauthorized({ success: false, message: 'Unauthorized' })
        }

        const [mostPopular, monthlyCounts, views, comparisons] = await Promise.all([
            this.mostPopularProperty(userId),
            this.monthlyCreatedAndAssigned(userId),
            this.viewsSummary(userId),
            this.comparisons(userId),
        ])

        return {
            success: true,
            data: {
                mostPopular,
                monthlyCounts,
                views,
                comparisons,
            },
        }
    }

    private async mostPopularProperty(agentId: string) {
        const mostViewed = await PropertyView.query()
            .join('properties', 'properties.id', 'property_views.property_id')
            .whereNull('properties.deleted_at')
            .where((builder) => {
                builder
                    .where('properties.assigned_agent_id', agentId)
                    .orWhere('properties.created_by', agentId)
            })
            .select('property_views.property_id')
            .count('* as views_count')
            .groupBy('property_views.property_id')
            .orderBy('views_count', 'desc')
            .first()

        if (mostViewed) {
            const propertyId = mostViewed.$extras?.property_id || mostViewed.propertyId
            const property = await Property.find(propertyId)
            if (property) {
                return {
                    property,
                    views: Number(mostViewed.$extras.views_count ?? 0),
                }
            }
        }

        const fallback = await Property.query()
            .whereNull('deleted_at')
            .where((builder) => {
                builder.where('assigned_agent_id', agentId).orWhere('created_by', agentId)
            })
            .orderBy('view_count', 'desc')
            .first()

        if (!fallback) return null

        return {
            property: fallback,
            views: fallback.viewCount ?? 0,
        }
    }

    private async monthlyCreatedAndAssigned(agentId: string) {
        const startOfMonth = DateTime.now().startOf('month')
        const endOfMonth = DateTime.now().endOf('month')

        const result = await Property.query()
            .whereNull('deleted_at')
            .whereBetween('created_at', [startOfMonth.toSQL()!, endOfMonth.toSQL()!])
            .where((builder) => {
                builder.where('created_by', agentId).orWhere('assigned_agent_id', agentId)
            })
            .select(
                db.raw(
                    `
      SUM(CASE WHEN created_by = ? THEN 1 ELSE 0 END) as created_count,
      SUM(CASE WHEN assigned_agent_id = ? THEN 1 ELSE 0 END) as assigned_count,
      SUM(CASE WHEN created_by = ? AND assigned_agent_id = ? THEN 1 ELSE 0 END) as both_count
    `,
                    [agentId, agentId, agentId, agentId]
                )
            )
            .first()

        return {
            createdByAgent: Number(result?.$extras.created_count ?? 0),
            assignedToAgent: Number(result?.$extras.assigned_count ?? 0),
            both: Number(result?.$extras.both_count ?? 0),
        }
    }

    private async viewsSummary(agentId: string) {
        const [daily, weekly, monthly] = await Promise.all([
            AgentDashboardService.countViewsBetween(agentId, 'daily'),
            AgentDashboardService.countViewsBetween(agentId, 'weekly'),
            AgentDashboardService.countViewsBetween(agentId, 'monthly'),
        ])

        return { daily, weekly, monthly }
    }

    private async comparisons(agentId: string) {
        const now = DateTime.now().setZone('Asia/Kolkata')

        const currentWeekStart = now.startOf('week')
        const previousWeekStart = currentWeekStart.minus({ weeks: 1 })
        const previousWeekEnd = currentWeekStart.minus({ milliseconds: 1 })

        const currentMonthStart = now.startOf('month')
        const previousMonthStart = currentMonthStart.minus({ months: 1 })
        const previousMonthEnd = currentMonthStart.minus({ milliseconds: 1 })

        const [currentWeek, previousWeek, currentMonth, previousMonth] = await Promise.all([
            AgentDashboardService.countViewsCustomRange(agentId, currentWeekStart, now),
            AgentDashboardService.countViewsCustomRange(
                agentId,
                previousWeekStart,
                previousWeekEnd
            ),
            AgentDashboardService.countViewsCustomRange(agentId, currentMonthStart, now),
            AgentDashboardService.countViewsCustomRange(
                agentId,
                previousMonthStart,
                previousMonthEnd
            ),
        ])

        return {
            weekOverWeek: {
                ...AgentDashboardService.calculateChange(
                    currentWeek.totalViews,
                    previousWeek.totalViews
                ),
                currentTotalViews: currentWeek.totalViews,
                previousTotalViews: previousWeek.totalViews,
            },
            monthOverMonth: {
                ...AgentDashboardService.calculateChange(
                    currentMonth.totalViews,
                    previousMonth.totalViews
                ),
                currentTotalViews: currentMonth.totalViews,
                previousTotalViews: previousMonth.totalViews,
            },
            snapshots: {
                currentWeek,
                previousWeek,
                currentMonth,
                previousMonth,
            },
        }
    }
}
