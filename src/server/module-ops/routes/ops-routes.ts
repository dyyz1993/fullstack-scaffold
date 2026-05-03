import { OpenAPIHono } from '@hono/zod-openapi'
import type { AuthUser } from '../../middleware/auth'
import { authRoutes } from './auth-routes'
import { userManagementRoutes } from './user-management-routes'
import { opsNotificationRoutes } from './ops-notification-routes'
import { mediaRoutes } from './media-routes'
import { exportRoutes } from './export-routes'
import { systemRoutes } from './system-routes'

const opsBase1 = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .route('/', authRoutes)
  .route('/', userManagementRoutes)

const opsBase2 = opsBase1.route('/', opsNotificationRoutes).route('/', mediaRoutes)

const opsBase3 = opsBase2.route('/', exportRoutes).route('/', systemRoutes)

export const opsRoutes = opsBase3

export default opsRoutes
