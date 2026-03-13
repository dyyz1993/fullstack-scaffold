import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware } from '../../middleware/auth'
import { getAuthUser } from '../../utils/auth'
import * as permissionService from '../services/permission-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  RoleInfoSchema,
  PermissionInfoSchema,
  UserPermissionsSchema,
  Role,
} from '@shared/modules/permission'

const getRolesRoute = createRoute({
  method: 'get',
  path: '/permissions/roles',
  tags: ['permissions'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(RoleInfoSchema.array(), 'Get all roles'),
    401: errorResponse('Unauthorized'),
  },
})

const getPermissionsRoute = createRoute({
  method: 'get',
  path: '/permissions',
  tags: ['permissions'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(PermissionInfoSchema.array(), 'Get all permissions'),
    401: errorResponse('Unauthorized'),
  },
})

const getUserPermissionsRoute = createRoute({
  method: 'get',
  path: '/permissions/me',
  tags: ['permissions'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(UserPermissionsSchema, 'Get current user permissions'),
    401: errorResponse('Unauthorized'),
  },
})

export const permissionRoutes = new OpenAPIHono()
  .openapi(getRolesRoute, async c => {
    const roles = permissionService.getAllRoles()
    return c.json({ success: true, data: roles })
  })
  .openapi(getPermissionsRoute, async c => {
    const permissions = permissionService.getAllPermissions()
    return c.json({ success: true, data: permissions })
  })
  .openapi(getUserPermissionsRoute, async c => {
    const user = getAuthUser(c)
    const permissions = permissionService.getUserPermissions(user.id, user.role as Role)
    return c.json({ success: true, data: permissions })
  })
