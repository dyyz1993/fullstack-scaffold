/**
 * @framework-baseline eed887772bb8ba6f
 * @framework-modify
 * @reason extract graceful shutdown into dedicated module for testability
 * @impact node.ts entry point shutdown logic
 */
import { logger } from '../utils/logger'

const log = logger.api()
const DRAIN_TIMEOUT_MS = 10_000

export function createShutdownHandler(
  server: { close: (callback?: () => void) => void },
  closeDb: () => Promise<void>
) {
  let isShuttingDown = false

  return async () => {
    if (isShuttingDown) return
    isShuttingDown = true

    log.info({}, 'Shutting down gracefully...')

    const forceExitTimer = setTimeout(() => {
      log.warn({}, 'Forcing exit after drain timeout')
      process.exit(1)
    }, DRAIN_TIMEOUT_MS)

    server.close(() => {
      log.info({}, 'All connections closed')
    })

    try {
      await closeDb()
      log.info({}, 'Database connection closed')
    } catch (err) {
      log.error({ err }, 'Error closing database')
    }

    clearTimeout(forceExitTimer)
    process.exit(0)
  }
}
