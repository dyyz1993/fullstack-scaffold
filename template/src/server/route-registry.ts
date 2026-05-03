import { OpenAPIHono } from '@hono/zod-openapi'
// @module-start:todos
import { apiRoutes } from './module-todos/routes/todos-routes'
// @module-end:todos
// @module-start:permission
import { permissionRoutes } from './module-permission/routes/permission-routes'
import { roleRoutes } from './module-permission/routes/role-routes'
import { auditLogRoutes } from './module-permission/routes/audit-log-routes'
// @module-end:permission
// @module-start:notifications
import { notificationRoutes } from './module-notifications/routes/notification-routes'
// @module-end:notifications
// @module-start:chat
import { chatRoutes } from './module-chat/routes/chat-routes'
// @module-end:chat
// @module-start:ops
import { opsRoutes } from './module-ops/routes/ops-routes'
// @module-end:ops
// @module-start:captcha
import { captchaRoutes } from './module-captcha/routes/captcha-routes'
// @module-end:captcha
// @module-start:order
import { orderRoutes } from './module-order/routes/order-routes'
// @module-end:order
// @module-start:ticket
import { ticketRoutes } from './module-ticket/routes/ticket-routes'
// @module-end:ticket
// @module-start:dispute
import { disputeRoutes } from './module-dispute/routes/dispute-routes'
// @module-end:dispute
// @module-start:content
import { contentRoutes } from './module-content/routes/content-routes'
// @module-end:content
// @module-start:file
import { fileRoutes } from './module-file/routes/file-routes'
// @module-end:file
// @module-start:tenant
import { tenantRoutes } from './module-tenant/routes/tenant-routes'
// @module-end:tenant
// @module-start:agent
import { agentRoutes, workspaceRoutes, fileRoutes as agentFileRoutes } from './module-agent'
// @module-end:agent

// 客户端路由 - 普通用户使用的 API
export const clientApiRoutes = new OpenAPIHono()
  // @module-start:chat
  .route('/api', chatRoutes)
  // @module-end:chat
  // @module-start:notifications
  .route('/api', notificationRoutes)
  // @module-end:notifications
  // @module-start:todos
  .route('/api', apiRoutes)
  // @module-end:todos
  // @module-start:tenant
  .route('/api', tenantRoutes)
  // @module-end:tenant
  // @module-start:agent
  .route('/api', agentRoutes)
  .route('/api', workspaceRoutes)
  .route('/api', agentFileRoutes)
  // @module-end:agent

// 运营后台路由 - 普通用户使用的 API + 管理功能
export const opsApiRoutes = new OpenAPIHono()
  .route('/', clientApiRoutes)
  // @module-start:order
  .route('/api', orderRoutes)
  // @module-end:order
  // @module-start:ticket
  .route('/api', ticketRoutes)
  // @module-end:ticket
  // @module-start:dispute
  .route('/api', disputeRoutes)
  // @module-end:dispute
  // @module-start:content
  .route('/api', contentRoutes)
  // @module-end:content
  // @module-start:file
  .route('/', fileRoutes)
  // @module-end:file
  // @module-start:captcha
  .route('/api', captchaRoutes)
  // @module-end:captcha
  // @module-start:permission
  .route('/api', permissionRoutes)
  .route('/api', roleRoutes)
  .route('/api', auditLogRoutes)
  // @module-end:permission
  // @module-start:ops
  .route('/api', opsRoutes)
  // @module-end:ops

// 导出类型
export type ClientApiRoutes = typeof clientApiRoutes
export type OpsApiRoutes = typeof opsApiRoutes
