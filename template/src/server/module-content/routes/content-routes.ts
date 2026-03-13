import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as contentService from '../services/content-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  ContentSchema,
  CreateContentSchema,
  UpdateContentSchema,
  ContentListSchema,
  DeleteResultSchema,
} from '@shared/modules/content'

const listRoute = createRoute({
  method: 'get',
  path: '/contents',
  tags: ['contents'],
  responses: {
    200: successResponse(ContentListSchema, 'List all contents'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/contents/{id}',
  tags: ['contents'],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(ContentSchema, 'Get content by id'),
    404: errorResponse('Content not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/contents',
  tags: ['contents'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateContentSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(ContentSchema, 'Create content'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/contents/{id}',
  tags: ['contents'],
  request: {
    params: ContentSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: UpdateContentSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(ContentSchema, 'Update content'),
    404: errorResponse('Content not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/contents/{id}',
  tags: ['contents'],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(DeleteResultSchema, 'Content deleted'),
    404: errorResponse('Content not found'),
    500: errorResponse('Internal server error'),
  },
})

export const contentRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await contentService.getContents()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.getContentById(id)
    if (!result) {
      return c.json({ success: false, error: 'Content not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRouteDef, async c => {
    const body = c.req.valid('json')
    const result = await contentService.createContent(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await contentService.updateContent(id, body)
    if (!result) {
      return c.json({ success: false, error: 'Content not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.deleteContent(id)
    if (!result) {
      return c.json({ success: false, error: 'Content not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
