import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppBindings, CreateAppOptions } from './types/bindings'
import { autoRegisterRealtime } from './core/realtime-scanner'
import { corsMiddleware, loggerMiddleware, errorHandlerMiddleware } from './middleware'
import { realtimeEnvMiddleware } from './middleware/realtime-env'
import { captchaMiddleware } from './middleware/captcha'
import { auditLogMiddleware } from './middleware/audit-log'
import { adminApiRoutes, clientApiRoutes } from './route-registry'
import { fileRoutes } from './module-file/routes/file-routes'

export { type AppBindings, type CreateAppOptions } from './types/bindings'

export function createApp<T extends AppBindings = AppBindings>(_options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<{ Bindings: T }>()
    .use('*', errorHandlerMiddleware())
    .use('*', loggerMiddleware())
    .use('*', corsMiddleware())
    .use('*', realtimeEnvMiddleware())
    .use('/api/*', auditLogMiddleware())
    .use(
      '/api/admin/*',
      captchaMiddleware({
        maxRequests: 20,
        windowMs: 60000,
      })
    )
    .route('/', clientApiRoutes)
    .route('/', adminApiRoutes)
    .route('/files', fileRoutes)
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
export type AdminApiType = typeof adminApiRoutes
export type ClientApiType = typeof clientApiRoutes
export type AppType = ReturnType<typeof createApp>
