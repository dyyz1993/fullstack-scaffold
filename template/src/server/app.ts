import { cors } from 'hono/cors'
import { Hono } from 'hono'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'
import { createRealtimeRoutes } from './module-realtime/routes/realtime-routes'
import type { AppBindings, CreateAppOptions } from './types/bindings'

export { type AppBindings, type CreateAppOptions } from './types/bindings'

export function createApp<T extends AppBindings = AppBindings>(_options: CreateAppOptions = {}) {
  const realtimeRoutes = createRealtimeRoutes()

  const app = new Hono<{ Bindings: T }>()
    .use(
      '*',
      cors({
        origin: ['*'],
        credentials: true,
      })
    )
    .route('/api', apiRoutes)
    .route('/api', notificationRoutes)
    .route('/api', realtimeRoutes)
    .get('/health', async c => {
      try {
        const { getDb } = await import('./db')
        await getDb()
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
      } catch {
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'not configured' })
      }
    })

  return app
}

export type AppType = ReturnType<typeof createApp>

export { apiRoutes, notificationRoutes }
