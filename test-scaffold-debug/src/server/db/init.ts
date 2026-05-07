import { getDb } from './driver'
import { logger } from '../utils/logger'

const log = logger.db()

export async function initializeDatabase() {
  await getDb()

  log.info({}, 'Initializing database...')
  log.info({}, 'Database initialization complete!')
}
