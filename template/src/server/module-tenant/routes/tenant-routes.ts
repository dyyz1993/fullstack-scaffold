import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as tenantService from '../services/tenant-service'
import {
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantListResponseSchema,
  TenantQuerySchema,
  TenantIdResponseSchema,
} from '@shared/schemas'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { NotFoundError } from '@server/utils/app-error'
import { authMiddleware, requireSuperAdminMiddleware } from '@server/middleware/auth'

const listRoute = createRoute({
  method: 'get',
  path: '/tenants',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    query: TenantQuerySchema,
  },
  responses: {
    200: successResponse(TenantListResponseSchema, 'List tenants'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/tenants/{id}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TenantSchema, 'Get tenant by ID'),
    404: errorResponse('Tenant not found'),
  },
})

const getBySlugRoute = createRoute({
  method: 'get',
  path: '/tenants/slug/{slug}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ slug: z.string() }),
  },
  responses: {
    200: successResponse(TenantSchema, 'Get tenant by slug'),
    404: errorResponse('Tenant not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/tenants',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    body: {
      content: { 'application/json': { schema: CreateTenantSchema } },
    },
  },
  responses: {
    201: successResponse(TenantSchema, 'Create a new tenant'),
    400: errorResponse('Invalid input or tenant slug already exists'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/tenants/{id}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: {
      content: { 'application/json': { schema: UpdateTenantSchema } },
    },
  },
  responses: {
    200: successResponse(TenantSchema, 'Update a tenant'),
    404: errorResponse('Tenant not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/tenants/{id}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TenantIdResponseSchema, 'Delete a tenant'),
    404: errorResponse('Tenant not found'),
  },
})

const getCurrentTenantRoute = createRoute({
  method: 'get',
  path: '/tenant/current',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(TenantSchema, 'Get current tenant from context'),
    404: errorResponse('Tenant not found in context'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const query = c.req.valid('query')

    const result = await tenantService.listTenants(query.page, query.pageSize, {
      status: query.status,
      plan: query.plan,
    })

    return c.json(success(result), 200)
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const tenant = await tenantService.getTenantById(id)
    if (!tenant) throw new NotFoundError('Tenant', String(id))
    return c.json(success(tenant), 200)
  })
  .openapi(getBySlugRoute, async c => {
    const { slug } = c.req.valid('param')
    const tenant = await tenantService.getTenantBySlug(slug)
    if (!tenant) throw new NotFoundError('Tenant', slug)
    return c.json(success(tenant), 200)
  })
  .openapi(createRouteDef, async c => {
    const data = c.req.valid('json')
    const tenant = await tenantService.createTenant(data)
    return c.json(success(tenant), 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const tenant = await tenantService.updateTenant(id, data)
    if (!tenant) throw new NotFoundError('Tenant', String(id))
    return c.json(success(tenant), 200)
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await tenantService.deleteTenant(id)
    if (!result) throw new NotFoundError('Tenant', String(id))
    return c.json(success({ id }), 200)
  })
  .openapi(getCurrentTenantRoute, async c => {
    const tenant = c.get('tenant')
    if (!tenant) throw new NotFoundError('Tenant context')
    return c.json(success(tenant), 200)
  })
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Tenant Management API',
    },
  })
