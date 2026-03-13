import { OpenAPIHono } from '@hono/zod-openapi'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { permissionRoutes } from './module-permission/routes/permission-routes'
import { roleRoutes } from './module-permission/routes/role-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'
import { chatRoutes } from './module-chat/routes/chat-routes'
import { adminRoutes } from './module-admin/routes/admin-routes'
import { captchaRoutes } from './module-captcha/routes/captcha-routes'
import { orderRoutes } from './module-order/routes/order-routes'
import { ticketRoutes } from './module-ticket/routes/ticket-routes'
import { disputeRoutes } from './module-dispute/routes/dispute-routes'
import { contentRoutes } from './module-content/routes/content-routes'
import type { AppBindings, CreateAppOptions } from './types/bindings'
import { autoRegisterRealtime } from './core/realtime-scanner'
import { corsMiddleware, loggerMiddleware, errorHandlerMiddleware } from './middleware'
import { realtimeEnvMiddleware } from './middleware/realtime-env'
import { captchaMiddleware } from './middleware/captcha'

export { type AppBindings, type CreateAppOptions } from './types/bindings'

export function createApp<T extends AppBindings = AppBindings>(_options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<{ Bindings: T }>()
    .use('*', errorHandlerMiddleware())
    .use('*', loggerMiddleware())
    .use('*', corsMiddleware())
    .use('*', realtimeEnvMiddleware())
    .use(
      '/api/admin/*',
      captchaMiddleware({
        maxRequests: 20,
        windowMs: 60000,
      })
    )
    .route('/api', notificationRoutes)
    .route('/api', permissionRoutes)
    .route('/api', roleRoutes)
    .route('/api', chatRoutes)
    .route('/api', apiRoutes)
    .route('/api', adminRoutes)
    .route('/api', captchaRoutes)
    .route('/api', orderRoutes)
    .route('/api', ticketRoutes)
    .route('/api', disputeRoutes)
    .route('/api', contentRoutes)
    .get('/health', async c => {
      try {
        const { getDb } = await import('./db')
        await getDb()
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
      } catch {
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'not configured' })
      }
    })
    .post('/api/__test__/cleanup', async c => {
      try {
        const { cleanupTestDatabase } = await import('./db/test-setup')
        await cleanupTestDatabase()
        return c.json({ success: true, message: 'Database cleaned up' })
      } catch (error) {
        console.error('Error during database cleanup:', error)
        return c.json({ success: false, message: 'Failed to cleanup database' }, 500)
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoRegisterRealtime(app as any)

  return app
}

export type AppType = ReturnType<typeof createApp>

export { apiRoutes, notificationRoutes, chatRoutes, adminRoutes }
