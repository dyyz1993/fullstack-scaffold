import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as disputeService from '../services/dispute-service'
import {
  successResponse,
  errorResponse,
  idRequest,
  bodyRequest,
  success,
  created,
} from '../../utils/route-helpers'
import { authMiddleware } from '../../middleware/auth'
import { Permission } from '@shared/modules/permission'
import {
  DisputeSchema,
  CreateDisputeSchema,
  UpdateDisputeSchema,
  DisputeListSchema,
  ResolveDisputeSchema,
} from '@shared/modules/dispute'
import { NotFoundError, BusinessError } from '../../utils/app-error'

const listRoute = createRoute({
  method: 'get',
  path: '/disputes',
  tags: ['disputes'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.DISPUTE_VIEW] })],
  request: {
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: successResponse(DisputeListSchema, 'List all disputes'),
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
    200: successResponse(DisputeSchema, 'Delete dispute'),
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
    const { limit, offset } = c.req.valid('query')
    const result = await disputeService.getDisputes()
    return c.json(success(result.slice(offset, offset + limit)), 200)
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
