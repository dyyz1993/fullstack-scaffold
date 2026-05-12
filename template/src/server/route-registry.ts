import { OpenAPIHono } from '@hono/zod-openapi'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { permissionRoutes } from './module-permission/routes/permission-routes'
import { roleRoutes } from './module-permission/routes/role-routes'
import { auditLogRoutes } from './module-permission/routes/audit-log-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'
import { chatRoutes } from './module-chat/routes/chat-routes'
import { adminRoutes } from './module-admin/routes/admin-routes'
import { clientAuthRoutes } from './module-admin/routes/client-auth-routes'
import { captchaRoutes } from './module-captcha/routes/captcha-routes'
import { orderRoutes } from './module-order/routes/order-routes'
import { ticketRoutes } from './module-ticket/routes/ticket-routes'
import { disputeRoutes } from './module-dispute/routes/dispute-routes'
import { contentRoutes } from './module-content/routes/content-routes'
import { publicContentRoutes } from './module-content/routes/public-content-routes'
import { fileRoutes } from './module-file/routes/file-routes'

const apiRateLimit = rateLimitMiddleware({
  windowMs: 60_000,
  max: 100,
  message: 'Too many requests',
})

export const clientApiRoutes = new OpenAPIHono()
  .use('*', apiRateLimit)
  .route('/api', clientAuthRoutes)
  .route('/api', chatRoutes)
  .route('/api', notificationRoutes)
  .route('/api', apiRoutes)
  .route('/api', publicContentRoutes)

// 管理后台路由 - 普通用户使用的 API + 管理功能
export const adminApiRoutes = new OpenAPIHono()
  .route('/api', orderRoutes)
  .route('/api', ticketRoutes)
  .route('/api', disputeRoutes)
  .route('/api', contentRoutes)
  .route('/api', fileRoutes)
  .route('/api', captchaRoutes)
  .route('/api', permissionRoutes)
  .route('/api', roleRoutes)
  .route('/api', auditLogRoutes)
  .route('/api', adminRoutes)

// 导出类型
export type ClientApiRoutes = typeof clientApiRoutes
export type AdminApiRoutes = typeof adminApiRoutes
