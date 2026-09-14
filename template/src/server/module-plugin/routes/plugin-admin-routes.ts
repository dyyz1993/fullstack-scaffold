import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AuthUser } from '@server/middleware/auth'
import { authMiddleware } from '@server/middleware/auth'
import { Role } from '@shared/modules/permission'
import * as adminPluginService from '../services/admin-plugin-service'
import * as adminCategoryService from '../services/admin-category-service'
import * as adminStatsService from '../services/admin-stats-service'
import {
  PluginSchema,
  CategorySchema,
  AdminDashboardStatsSchema,
  PluginListAdminSchema,
  AdminListQuerySchema,
  AdminListAllQuerySchema,
  PluginSlugSchema,
  RejectPluginBodySchema,
  PluginDeleteResponseSchema,
  BulkApproveBodySchema,
  BulkRejectBodySchema,
  BulkResponseSchema,
  CreateCategoryBodySchema,
  UpdateCategoryBodySchema,
  CategoryIdParamsSchema,
  CategoryIdResponseSchema,
} from '@shared/schemas'
import { successResponse, errorResponse, success, created } from '@server/utils/route-helpers'

const getDashboardStatsRoute = createRoute({
  method: 'get',
  path: '/stats/dashboard',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  responses: {
    200: successResponse(AdminDashboardStatsSchema, 'Dashboard stats'),
  },
})

const listPendingRoute = createRoute({
  method: 'get',
  // 挂载于 /api，若用 /plugins/pending 会被 client 侧 GET /plugins/{slug}
  // （先注册）遮蔽成 slug='pending' 的详情查询，故收进 /plugins/admin/ 命名空间
  path: '/plugins/admin/pending',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    query: AdminListQuerySchema,
  },
  responses: {
    200: successResponse(PluginListAdminSchema, 'Pending plugins'),
  },
})

const listAllPluginsRoute = createRoute({
  method: 'get',
  // 同上：GET /plugins 会命中 client 公开列表（仅 approved），管理端全量列表
  // 需要独立路径才能覆盖 pending/rejected
  path: '/plugins/admin/list',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    query: AdminListAllQuerySchema,
  },
  responses: {
    200: successResponse(PluginListAdminSchema, 'All plugins'),
  },
})

const approvePluginRoute = createRoute({
  method: 'put',
  path: '/plugins/{slug}/approve',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginSchema, 'Plugin approved'),
    404: errorResponse('Plugin not found'),
  },
})

const rejectPluginRoute = createRoute({
  method: 'put',
  path: '/plugins/{slug}/reject',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    params: PluginSlugSchema,
    body: { content: { 'application/json': { schema: RejectPluginBodySchema } } },
  },
  responses: {
    200: successResponse(PluginSchema, 'Plugin rejected'),
    404: errorResponse('Plugin not found'),
  },
})

const toggleFeaturedRoute = createRoute({
  method: 'put',
  path: '/plugins/{slug}/feature',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginSchema, 'Featured toggled'),
    404: errorResponse('Plugin not found'),
  },
})

const removePluginRoute = createRoute({
  method: 'delete',
  // DELETE /plugins/{slug} 与 client 作者删除路由同形（client 先注册会被遮蔽
  // 且无超管门槛），管理端删除收进 /plugins/admin/{slug}
  path: '/plugins/admin/{slug}',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginDeleteResponseSchema, 'Plugin removed'),
    404: errorResponse('Plugin not found'),
  },
})

const bulkApproveRoute = createRoute({
  method: 'post',
  path: '/plugins/bulk-approve',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: { content: { 'application/json': { schema: BulkApproveBodySchema } } },
  },
  responses: {
    200: successResponse(BulkResponseSchema, 'Bulk approved'),
  },
})

const bulkRejectRoute = createRoute({
  method: 'post',
  path: '/plugins/bulk-reject',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: {
      content: {
        'application/json': {
          schema: BulkRejectBodySchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(BulkResponseSchema, 'Bulk rejected'),
  },
})

const listCategoriesRoute = createRoute({
  method: 'get',
  // GET /categories 与 client 公开分类列表同形被遮蔽，管理端列表独立路径
  path: '/categories/admin',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  responses: {
    200: successResponse(z.array(CategorySchema), 'List categories'),
  },
})

const createCategoryRoute = createRoute({
  method: 'post',
  path: '/categories',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategoryBodySchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(CategorySchema, 'Category created'),
    409: errorResponse('Category slug already exists'),
  },
})

const updateCategoryRoute = createRoute({
  method: 'put',
  path: '/categories/{id}',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    params: CategoryIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCategoryBodySchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(CategorySchema, 'Category updated'),
    404: errorResponse('Category not found'),
  },
})

const deleteCategoryRoute = createRoute({
  method: 'delete',
  path: '/categories/{id}',
  tags: ['admin-plugins'],
  // 管理端点仅超管可用；unknown-role 已在 authMiddleware 内按最低权限处理
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: { params: CategoryIdParamsSchema },
  responses: {
    200: successResponse(CategoryIdResponseSchema, 'Category deleted'),
    404: errorResponse('Category not found'),
  },
})

export const pluginAdminRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getDashboardStatsRoute, async c => {
    const stats = await adminStatsService.getDashboardStats()
    return c.json(success(stats), 200)
  })
  .openapi(listPendingRoute, async c => {
    const { page, limit } = c.req.valid('query')
    const result = await adminPluginService.listPending({ page, limit })
    return c.json(success(result), 200)
  })
  .openapi(listAllPluginsRoute, async c => {
    const { page, limit, status } = c.req.valid('query')
    const result = await adminPluginService.listAllPlugins({ page, limit, status })
    return c.json(success(result), 200)
  })
  .openapi(approvePluginRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await adminPluginService.approvePlugin(slug)
    return c.json(success(plugin), 200)
  })
  .openapi(rejectPluginRoute, async c => {
    const { slug } = c.req.valid('param')
    const { reason } = c.req.valid('json')
    const plugin = await adminPluginService.rejectPlugin(slug, reason)
    return c.json(success(plugin), 200)
  })
  .openapi(toggleFeaturedRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await adminPluginService.toggleFeatured(slug)
    return c.json(success(plugin), 200)
  })
  .openapi(removePluginRoute, async c => {
    const { slug } = c.req.valid('param')
    await adminPluginService.adminRemovePlugin(slug)
    return c.json(success({ slug }), 200)
  })
  .openapi(bulkApproveRoute, async c => {
    const { slugs } = c.req.valid('json')
    const count = await adminPluginService.bulkApprove(slugs)
    return c.json(success({ count }), 200)
  })
  .openapi(bulkRejectRoute, async c => {
    const { slugs, reason } = c.req.valid('json')
    const count = await adminPluginService.bulkReject(slugs, reason)
    return c.json(success({ count }), 200)
  })
  .openapi(listCategoriesRoute, async c => {
    const categories = await adminCategoryService.listAllCategories()
    return c.json(success(categories), 200)
  })
  .openapi(createCategoryRoute, async c => {
    const data = c.req.valid('json')
    const category = await adminCategoryService.createCategory(data)
    return c.json(created(category), 201)
  })
  .openapi(updateCategoryRoute, async c => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const category = await adminCategoryService.updateCategory(id, data)
    return c.json(success(category), 200)
  })
  .openapi(deleteCategoryRoute, async c => {
    const { id } = c.req.valid('param')
    await adminCategoryService.deleteCategory(id)
    return c.json(success({ id }), 200)
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type PluginAdminApiType = typeof pluginAdminRoutes
