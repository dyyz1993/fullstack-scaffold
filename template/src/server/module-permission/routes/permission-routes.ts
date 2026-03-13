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
  MenuConfigSchema,
  PagePermissionsSchema,
  PermissionCategoriesSchema,
  RoleLabelsSchema,
  PermissionLabelsSchema,
} from '@shared/modules/permission'

const getRolesRoute = createRoute({
  method: 'get',
  path: '/permissions/roles',
  tags: ['permissions'],
  responses: {
    200: successResponse(RoleInfoSchema.array(), 'Get all roles'),
  },
})

const getPermissionsRoute = createRoute({
  method: 'get',
  path: '/permissions',
  tags: ['permissions'],
  responses: {
    200: successResponse(PermissionInfoSchema.array(), 'Get all permissions'),
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

const getMenuConfigRoute = createRoute({
  method: 'get',
  path: '/permissions/menu-config',
  tags: ['permissions'],
  responses: {
    200: successResponse(MenuConfigSchema, 'Get menu configuration'),
  },
})

const getPagePermissionsRoute = createRoute({
  method: 'get',
  path: '/permissions/page-permissions',
  tags: ['permissions'],
  responses: {
    200: successResponse(PagePermissionsSchema, 'Get page permissions configuration'),
  },
})

const getPermissionCategoriesRoute = createRoute({
  method: 'get',
  path: '/permissions/categories',
  tags: ['permissions'],
  responses: {
    200: successResponse(PermissionCategoriesSchema, 'Get permission categories'),
  },
})

const getRoleLabelsRoute = createRoute({
  method: 'get',
  path: '/permissions/role-labels',
  tags: ['permissions'],
  responses: {
    200: successResponse(RoleLabelsSchema, 'Get role labels'),
  },
})

const getPermissionLabelsRoute = createRoute({
  method: 'get',
  path: '/permissions/permission-labels',
  tags: ['permissions'],
  responses: {
    200: successResponse(PermissionLabelsSchema, 'Get permission labels'),
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
    const permissions = permissionService.getUserPermissions(user.id, user.role)
    return c.json({ success: true, data: permissions })
  })
  .openapi(getMenuConfigRoute, async c => {
    const menuConfig = permissionService.getMenuConfig()
    return c.json({ success: true, data: menuConfig })
  })
  .openapi(getPagePermissionsRoute, async c => {
    const pagePermissions = permissionService.getPagePermissions()
    return c.json({ success: true, data: pagePermissions })
  })
  .openapi(getPermissionCategoriesRoute, async c => {
    const categories = permissionService.getPermissionCategories()
    return c.json({ success: true, data: categories })
  })
  .openapi(getRoleLabelsRoute, async c => {
    const labels = permissionService.getRoleLabels()
    return c.json({ success: true, data: labels })
  })
  .openapi(getPermissionLabelsRoute, async c => {
    const labels = permissionService.getPermissionLabels()
    return c.json({ success: true, data: labels })
  })
