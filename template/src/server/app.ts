import { cors } from 'hono/cors'
import { OpenAPIHono } from '@hono/zod-openapi'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'
import { chatRoutes } from './module-chat/routes/chat-routes'
import type { AppBindings, CreateAppOptions } from './types/bindings'
import { autoRegisterRealtime } from './core/realtime-scanner'

export { type AppBindings, type CreateAppOptions } from './types/bindings'

export function createApp<T extends AppBindings = AppBindings>(_options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<{ Bindings: T }>()
    .use(
      '*',
      cors({
        origin: ['*'],
        credentials: true,
      })
    )
    .route('/api', notificationRoutes)
    .route('/api', chatRoutes)
    .route('/api', apiRoutes)
    .get('/health', async c => {
      try {
        const { getDb } = await import('./db')
        await getDb()
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
      } catch {
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'not configured' })
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoRegisterRealtime(app as any)

  return app
}

export type AppType = ReturnType<typeof createApp>

export { apiRoutes, notificationRoutes, chatRoutes }
