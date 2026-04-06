import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class WorkerStart extends BaseCommand {
    static commandName = 'worker:start'
    static description = 'Start the BullMQ workers'

    // 👇 The correct v6 configuration
    static options: CommandOptions = {
        startApp: true, // Fully boots database, mailers, and models
        staysAlive: true, // Keeps the worker process running natively
    }

    async run() {
        this.logger.info('Starting BullMQ workers...')

        // Import your worker instance file
        await import('../app/queues/workers.js')
    }
}
