import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as contentService from '../services/content-service'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import { NotFoundError } from '@server/utils/app-error'
import { success, list } from '@server/utils/response'
import { z } from '@hono/zod-openapi'
import { ContentSchema, ContentCategorySchema } from '@shared/modules/content'

const listPublicRoute = createRoute({
  method: 'get',
  path: '/public/contents',
  tags: ['public-contents'],
  request: {
    query: z.object({
      category: ContentCategorySchema.optional(),
      search: z.string().optional(),
      limit: z.coerce.number().int().positive().max(50).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: successResponse(z.array(ContentSchema), 'List published contents'),
  },
})

const getPublicRoute = createRoute({
  method: 'get',
  path: '/public/contents/{id}',
  tags: ['public-contents'],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(ContentSchema, 'Get published content'),
    404: errorResponse('Content not found'),
  },
})

export const publicContentRoutes = new OpenAPIHono()
  .openapi(listPublicRoute, async c => {
    const { category, search, limit, offset } = c.req.valid('query')
    const result = await contentService.getContents({
      status: 'published',
      category,
      search,
    })
    const items = result.slice(offset, offset + limit)
    return c.json(list(items, result.length), 200)
  })
  .openapi(getPublicRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await contentService.getContentById(id)
    if (!result || result.status !== 'published') {
      throw new NotFoundError('Content', id)
    }
    return c.json(success(result), 200)
  })
