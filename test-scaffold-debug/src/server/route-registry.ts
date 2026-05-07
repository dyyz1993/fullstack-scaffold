import { OpenAPIHono } from '@hono/zod-openapi'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { chatRoutes } from './module-chat/routes/chat-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'

const apiRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 100,
})

// client API routes
export const clientApiRoutes = new OpenAPIHono()
  .use('*', apiRateLimit)
  .route('/api', apiRoutes)
  .route('/api', chatRoutes)
  .route('/api', notificationRoutes)

// No admin modules selected
export const adminApiRoutes = new OpenAPIHono()

export type ClientApiRoutes = typeof clientApiRoutes
export type AdminApiRoutes = typeof adminApiRoutes
