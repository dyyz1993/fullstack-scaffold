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
import { authRoutes } from './module-auth/routes/auth-routes'
import { pluginRoutes } from './module-plugin/routes/plugin-routes'
import { pluginAdminRoutes } from './module-plugin/routes/plugin-admin-routes'
import { dashboardRoutes } from './module-admin/routes/dashboard-routes'
import { cartRoutes } from './module-order/routes/cart-routes'
import { ordersMockRoutes } from './module-order/routes/orders-mock-routes'
import { topicsRoutes } from './module-content/routes/topics-routes'
import { apiRoutes as tenantRoutes } from './module-tenant/routes/tenant-routes'
import { apiRoutes as merchantRoutes } from './module-merchant/routes/merchant-routes'

const apiRateLimit = rateLimitMiddleware({
  windowMs: 60_000,
  max: 100,
  message: 'Too many requests',
})

export const clientApiRoutes = new OpenAPIHono()
  .use('*', apiRateLimit)
  .route('/api', clientAuthRoutes)
  .route('/api', authRoutes)
  .route('/api', chatRoutes)
  .route('/api', notificationRoutes)
  .route('/api', apiRoutes)
  .route('/api', pluginRoutes)
  .route('/api', publicContentRoutes)
  .route('/api', cartRoutes)
  .route('/api', ordersMockRoutes)
  .route('/api', topicsRoutes)
  .route('/api', merchantRoutes)

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
  .route('/api', pluginAdminRoutes)
  .route('/api', dashboardRoutes)
  .route('/api', tenantRoutes)

// 导出类型
export type ClientApiRoutes = typeof clientApiRoutes
export type AdminApiRoutes = typeof adminApiRoutes
