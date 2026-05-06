import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as contentService from '../services/content-service'
import { successResponse, errorResponse, success, created } from '@server/utils/route-helpers'
import { NotFoundError } from '@server/utils/app-error'
import { authMiddleware } from '@server/middleware/auth'
import { Permission } from '@shared/modules/permission'
import { z } from '@hono/zod-openapi'
import {
  ContentSchema,
  CreateContentSchema,
  UpdateContentSchema,
  ContentListSchema,
  DeleteResultSchema,
} from '@shared/modules/content'
import { BusinessError } from '@server/utils/app-error'

const listRoute = createRoute({
  method: 'get',
  path: '/contents',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_VIEW] })],
  request: {
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: successResponse(ContentListSchema, 'List all contents'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/contents/{id}',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_VIEW] })],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(ContentSchema, 'Get content by id'),
    404: errorResponse('Content not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/contents',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_CREATE] })],
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
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/contents/{id}',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_EDIT] })],
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
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/contents/{id}',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_DELETE] })],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(DeleteResultSchema, 'Content deleted'),
    404: errorResponse('Content not found'),
  },
})

const publishRoute = createRoute({
  method: 'put',
  path: '/contents/{id}/publish',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_EDIT] })],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(ContentSchema, 'Content published'),
    404: errorResponse('Content not found'),
    422: errorResponse('Content cannot be published'),
  },
})

const archiveRoute = createRoute({
  method: 'put',
  path: '/contents/{id}/archive',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.CONTENT_EDIT] })],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(ContentSchema, 'Content archived'),
    404: errorResponse('Content not found'),
    422: errorResponse('Content cannot be archived'),
  },
})

export const contentRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const { limit, offset } = c.req.valid('query')
    const result = await contentService.getContents()
    return c.json(success(result.slice(offset, offset + limit)), 200)
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.getContentById(id)
    if (!result) throw new NotFoundError('Content', id)
    return c.json(success(result), 200)
  })
  .openapi(createRouteDef, async c => {
    const body = c.req.valid('json')
    const result = await contentService.createContent(body)
    return c.json(created(result), 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await contentService.updateContent(id, body)
    if (!result) throw new NotFoundError('Content', id)
    return c.json(success(result), 200)
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.deleteContent(id)
    if (!result.success) throw new NotFoundError('Content', id)
    return c.json(success({ message: 'Deleted successfully' }), 200)
  })
  .openapi(publishRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.publishContent(id)
    if (!result) throw new BusinessError('Content cannot be published (must be in draft state)')
    return c.json(success(result), 200)
  })
  .openapi(archiveRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.archiveContent(id)
    if (!result) throw new BusinessError('Content cannot be archived (must be in published state)')
    return c.json(success(result), 200)
  })
