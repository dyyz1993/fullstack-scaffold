import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as disputeService from '../services/dispute-service'
import {
  successResponse,
  errorResponse,
  idRequest,
  bodyRequest,
  success,
  created,
} from '@server/utils/route-helpers'
import { authMiddleware } from '@server/middleware/auth'
import { Permission } from '@shared/modules/permission'
import {
  DisputeSchema,
  CreateDisputeSchema,
  UpdateDisputeSchema,
  DisputeListResponseSchema,
  DisputeListQuerySchema,
  ResolveDisputeSchema,
  DisputeDeleteResultSchema,
} from '@shared/modules/dispute'
import { NotFoundError, BusinessError } from '@server/utils/app-error'

const listRoute = createRoute({
  method: 'get',
  path: '/disputes',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_VIEW] })],
  request: {
    query: DisputeListQuerySchema,
  },
  responses: {
    200: successResponse(DisputeListResponseSchema, 'List all disputes'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/disputes/{id}',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_VIEW] })],
  request: { params: DisputeSchema.pick({ id: true }) },
  responses: {
    200: successResponse(DisputeSchema, 'Get dispute by id'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Dispute not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/disputes',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_CREATE] })],
  request: bodyRequest(CreateDisputeSchema),
  responses: {
    201: successResponse(DisputeSchema, 'Create dispute'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/disputes/{id}',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_EDIT] })],
  request: { params: DisputeSchema.pick({ id: true }), ...bodyRequest(UpdateDisputeSchema) },
  responses: {
    200: successResponse(DisputeSchema, 'Update dispute'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Dispute not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/disputes/{id}',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_DELETE] })],
  request: idRequest,
  responses: {
    200: successResponse(DisputeDeleteResultSchema, 'Delete dispute'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Dispute not found'),
  },
})

const resolveRoute = createRoute({
  method: 'put',
  path: '/disputes/{id}/resolve',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_RESOLVE] })],
  request: { params: DisputeSchema.pick({ id: true }), ...bodyRequest(ResolveDisputeSchema) },
  responses: {
    200: successResponse(DisputeSchema, 'Dispute resolved'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Dispute not found'),
    422: errorResponse('Cannot resolve dispute in current state'),
  },
})

export const disputeRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const { page, limit } = c.req.valid('query')
    const result = await disputeService.getDisputes({ page, limit })
    return c.json(success(result), 200)
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await disputeService.getDisputeById(id)
    if (!result) throw NotFoundError.dispute(id)
    return c.json(success(result), 200)
  })
  .openapi(createRouteDef, async c => {
    const body = c.req.valid('json')
    const result = await disputeService.createDispute(body)
    return c.json(created(result), 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await disputeService.updateDispute(id, body)
    if (!result) throw NotFoundError.dispute(id)
    return c.json(success(result), 200)
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await disputeService.deleteDispute(id)
    if (!result.success) throw NotFoundError.dispute(id)
    return c.json(success({ message: 'Deleted successfully' }), 200)
  })
  .openapi(resolveRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await disputeService.resolveDispute(id, body)
    if (!result) throw new BusinessError('Cannot resolve dispute in current state')
    return c.json(success(result), 200)
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type DisputesApiType = typeof disputeRoutes
