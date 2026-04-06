import { SavedSearchService } from '#services/saved_search_service'
import { Queue } from 'bullmq'
// import SendSavedSearchAlertEmail from './send_saved_search_alert_email.js'

export default class CheckSavedSearchesJob {
    constructor(private frequency: 'daily' | 'instant' | 'weekly') {}
    async handle() {
        const searches = await SavedSearchService.getDueSearches(this.frequency)
        const emailQueue = new Queue('send_saved_search_alert')

        for (const search of searches) {
            const newMatches = await SavedSearchService.findNewMatches(search)

            if (!newMatches.length) continue

            await emailQueue.add('send_saved_search_alert', {
                user: search.user,
                savedSearch: search,
                newProperties: newMatches,
            })

            await SavedSearchService.markAlertSent(search.id)
        }
    }
}
