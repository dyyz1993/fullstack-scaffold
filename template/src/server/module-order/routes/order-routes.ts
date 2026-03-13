import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as orderService from '../services/order-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  OrderSchema,
  CreateOrderSchema,
  UpdateOrderSchema,
  OrderListSchema,
  DeleteResultSchema,
} from '@shared/modules/order'

const listRoute = createRoute({
  method: 'get',
  path: '/orders',
  tags: ['orders'],
  responses: {
    200: successResponse(OrderListSchema, 'List all orders'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/orders/{id}',
  tags: ['orders'],
  request: {
    params: OrderSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(OrderSchema, 'Get order by id'),
    404: errorResponse('Order not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/orders',
  tags: ['orders'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrderSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(OrderSchema, 'Create order'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/orders/{id}',
  tags: ['orders'],
  request: {
    params: OrderSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: UpdateOrderSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(OrderSchema, 'Update order'),
    404: errorResponse('Order not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/orders/{id}',
  tags: ['orders'],
  request: {
    params: OrderSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(DeleteResultSchema, 'Order deleted'),
    404: errorResponse('Order not found'),
    500: errorResponse('Internal server error'),
  },
})

const processRoute = createRoute({
  method: 'put',
  path: '/orders/{id}/process',
  tags: ['orders'],
  request: {
    params: OrderSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(OrderSchema, 'Order processed'),
    404: errorResponse('Order not found'),
    400: errorResponse('Cannot process order'),
    500: errorResponse('Internal server error'),
  },
})

const cancelRoute = createRoute({
  method: 'put',
  path: '/orders/{id}/cancel',
  tags: ['orders'],
  request: {
    params: OrderSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(OrderSchema, 'Order cancelled'),
    404: errorResponse('Order not found'),
    400: errorResponse('Cannot cancel order'),
    500: errorResponse('Internal server error'),
  },
})

export const orderRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await orderService.getOrders()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await orderService.getOrderById(id)
    if (!result) {
      return c.json({ success: false, error: 'Order not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRouteDef, async c => {
    const body = c.req.valid('json')
    const result = await orderService.createOrder(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await orderService.updateOrder(id, body)
    if (!result) {
      return c.json({ success: false, error: 'Order not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await orderService.deleteOrder(id)
    if (!result) {
      return c.json({ success: false, error: 'Order not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
  .openapi(processRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await orderService.processOrder(id)
    if (!result) {
      return c.json({ success: false, error: 'Cannot process order' }, 400)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(cancelRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await orderService.cancelOrder(id)
    if (!result) {
      return c.json({ success: false, error: 'Cannot cancel order' }, 400)
    }
    return c.json({ success: true, data: result })
  })
