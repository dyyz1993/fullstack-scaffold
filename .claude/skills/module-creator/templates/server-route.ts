// template/src/server/module-{name}/routes/{name}-routes.ts
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import { {Name}Schema, Create{Name}Schema } from '@shared/schemas'
import * as {name}Service from '../services/{name}-service'

// === Route Definitions ===

const listRoute = createRoute({
  method: 'get',
  path: '/{names}',
  responses: {
    200: successResponse(z.array({Name}Schema), 'List {names}'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/{names}/:id',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse({Name}Schema, 'Get {name} by ID'),
    404: errorResponse('{Name} not found'),
  },
})

const createRoute = createRoute({
  method: 'post',
  path: '/{names}',
  request: {
    body: {
      content: {
        'application/json': { schema: Create{Name}Schema },
      },
    },
  },
  responses: {
    201: successResponse({Name}Schema, 'Created {name}'),
    400: errorResponse('Validation failed'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/{names}/:id',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': { schema: Create{Name}Schema.partial() },
      },
    },
  },
  responses: {
    200: successResponse({Name}Schema, 'Updated {name}'),
    404: errorResponse('{Name} not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{names}/:id',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(z.object({ deleted: z.literal(true) }), 'Deleted {name}'),
    404: errorResponse('{Name} not found'),
  },
})

// === Route Registration (Chain Syntax Required) ===

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const items = await {name}Service.list{Names}()
    return c.json({ success: true as const, data: items })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const item = await {name}Service.get{Name}ById(Number(id))
    if (!item) {
      return c.json({ success: false, error: '{Name} not found' }, 404)
    }
    return c.json({ success: true as const, data: item })
  })
  .openapi(createRoute, async c => {
    const body = c.req.valid('json')
    const item = await {name}Service.create{Name}(body)
    return c.json({ success: true as const, data: item }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const item = await {name}Service.update{Name}(Number(id), body)
    if (!item) {
      return c.json({ success: false, error: '{Name} not found' }, 404)
    }
    return c.json({ success: true as const, data: item })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    await {name}Service.delete{Name}(Number(id))
    return c.json({ success: true as const, data: { deleted: true as const } })
  })
