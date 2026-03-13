import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as disputeService from '../services/dispute-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  DisputeSchema,
  CreateDisputeSchema,
  UpdateDisputeSchema,
  DisputeListSchema,
  DeleteResultSchema,
  ResolveDisputeSchema,
} from '@shared/modules/dispute'

const listRoute = createRoute({
  method: 'get',
  path: '/disputes',
  tags: ['disputes'],
  responses: {
    200: successResponse(DisputeListSchema, 'List all disputes'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/disputes/{id}',
  tags: ['disputes'],
  request: {
    params: DisputeSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(DisputeSchema, 'Get dispute by id'),
    404: errorResponse('Dispute not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/disputes',
  tags: ['disputes'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateDisputeSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(DisputeSchema, 'Create dispute'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/disputes/{id}',
  tags: ['disputes'],
  request: {
    params: DisputeSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: UpdateDisputeSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(DisputeSchema, 'Update dispute'),
    404: errorResponse('Dispute not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/disputes/{id}',
  tags: ['disputes'],
  request: {
    params: DisputeSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(DeleteResultSchema, 'Dispute deleted'),
    404: errorResponse('Dispute not found'),
    500: errorResponse('Internal server error'),
  },
})

const resolveRoute = createRoute({
  method: 'put',
  path: '/disputes/{id}/resolve',
  tags: ['disputes'],
  request: {
    params: DisputeSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: ResolveDisputeSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(DisputeSchema, 'Dispute resolved'),
    404: errorResponse('Dispute not found'),
    400: errorResponse('Cannot resolve dispute'),
    500: errorResponse('Internal server error'),
  },
})

export const disputeRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await disputeService.getDisputes()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await disputeService.getDisputeById(id)
    if (!result) {
      return c.json({ success: false, error: 'Dispute not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRouteDef, async c => {
    const body = c.req.valid('json')
    const result = await disputeService.createDispute(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await disputeService.updateDispute(id, body)
    if (!result) {
      return c.json({ success: false, error: 'Dispute not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await disputeService.deleteDispute(id)
    if (!result.success) {
      return c.json({ success: false, error: 'Dispute not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
  .openapi(resolveRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await disputeService.resolveDispute(id, body)
    if (!result) {
      return c.json({ success: false, error: 'Cannot resolve dispute' }, 400)
    }
    return c.json({ success: true, data: result })
  })
