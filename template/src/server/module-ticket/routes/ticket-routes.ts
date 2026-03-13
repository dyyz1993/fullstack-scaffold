import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as ticketService from '../services/ticket-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  TicketSchema,
  CreateTicketSchema,
  UpdateTicketSchema,
  TicketListSchema,
  DeleteResultSchema,
  ReplyTicketSchema,
} from '@shared/modules/ticket'

const listRoute = createRoute({
  method: 'get',
  path: '/tickets',
  tags: ['tickets'],
  responses: {
    200: successResponse(TicketListSchema, 'List all tickets'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/tickets/{id}',
  tags: ['tickets'],
  request: {
    params: TicketSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(TicketSchema, 'Get ticket by id'),
    404: errorResponse('Ticket not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/tickets',
  tags: ['tickets'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTicketSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(TicketSchema, 'Create ticket'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/tickets/{id}',
  tags: ['tickets'],
  request: {
    params: TicketSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTicketSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(TicketSchema, 'Update ticket'),
    404: errorResponse('Ticket not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/tickets/{id}',
  tags: ['tickets'],
  request: {
    params: TicketSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(DeleteResultSchema, 'Ticket deleted'),
    404: errorResponse('Ticket not found'),
    500: errorResponse('Internal server error'),
  },
})

const replyRoute = createRoute({
  method: 'post',
  path: '/tickets/{id}/reply',
  tags: ['tickets'],
  request: {
    params: TicketSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: ReplyTicketSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(TicketSchema, 'Ticket replied'),
    404: errorResponse('Ticket not found'),
    400: errorResponse('Cannot reply ticket'),
    500: errorResponse('Internal server error'),
  },
})

const closeRoute = createRoute({
  method: 'put',
  path: '/tickets/{id}/close',
  tags: ['tickets'],
  request: {
    params: TicketSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(TicketSchema, 'Ticket closed'),
    404: errorResponse('Ticket not found'),
    400: errorResponse('Cannot close ticket'),
    500: errorResponse('Internal server error'),
  },
})

export const ticketRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await ticketService.getTickets()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ticketService.getTicketById(id)
    if (!result) {
      return c.json({ success: false, error: 'Ticket not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRouteDef, async c => {
    const body = c.req.valid('json')
    const result = await ticketService.createTicket(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await ticketService.updateTicket(id, body)
    if (!result) {
      return c.json({ success: false, error: 'Ticket not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ticketService.deleteTicket(id)
    if (!result.success) {
      return c.json({ success: false, error: 'Ticket not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
  .openapi(replyRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await ticketService.replyTicket(id, body)
    if (!result) {
      return c.json({ success: false, error: 'Cannot reply ticket' }, 400)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(closeRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ticketService.closeTicket(id)
    if (!result) {
      return c.json({ success: false, error: 'Cannot close ticket' }, 400)
    }
    return c.json({ success: true, data: result })
  })
