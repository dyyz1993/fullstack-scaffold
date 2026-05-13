import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as pluginService from '../services/plugin-service'
import * as queryService from '../services/plugin-query-service'
import * as reviewService from '../services/plugin-review-service'
import {
  PluginSchema,
  CreatePluginSchema,
  UpdatePluginSchema,
  PluginSlugSchema,
  ReviewSchema,
  CreateReviewSchema,
  MarketplaceStatsSchema,
  CategorySchema,
  VersionSchema,
  PluginListResponseSchema,
  PluginListQuerySchema,
  PluginSearchQuerySchema,
  PluginDeleteResponseSchema,
  ReviewIdParamsSchema,
  ReviewDeleteResponseSchema,
  CategorySlugParamsSchema,
  CategoryPluginsQuerySchema,
} from '@shared/schemas'
import { successResponse, errorResponse, success, created } from '@server/utils/route-helpers'
import { getAuthUser } from '@server/utils/auth'

const listRoute = createRoute({
  method: 'get',
  path: '/plugins',
  tags: ['plugins'],
  request: { query: PluginListQuerySchema },
  responses: {
    200: successResponse(PluginListResponseSchema, 'List plugins'),
  },
})

const searchRoute = createRoute({
  method: 'get',
  path: '/plugins/search',
  tags: ['plugins'],
  request: {
    query: PluginSearchQuerySchema,
  },
  responses: {
    200: successResponse(PluginListResponseSchema, 'Search plugins'),
  },
})

const getBySlugRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginSchema, 'Get plugin by slug'),
    404: errorResponse('Plugin not found'),
  },
})

const getVersionsRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}/versions',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(z.array(VersionSchema), 'List plugin versions'),
    404: errorResponse('Plugin not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/plugins',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreatePluginSchema } } },
  },
  responses: {
    201: successResponse(PluginSchema, 'Create plugin'),
    400: errorResponse('Invalid input'),
    409: errorResponse('Plugin slug already exists'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/plugins/{slug}',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  request: {
    params: PluginSlugSchema,
    body: { content: { 'application/json': { schema: UpdatePluginSchema } } },
  },
  responses: {
    200: successResponse(PluginSchema, 'Update plugin'),
    404: errorResponse('Plugin not found'),
    403: errorResponse('Forbidden'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/plugins/{slug}',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginDeleteResponseSchema, 'Delete plugin'),
    404: errorResponse('Plugin not found'),
    403: errorResponse('Forbidden'),
  },
})

const submitReviewRoute = createRoute({
  method: 'post',
  path: '/plugins/{slug}/reviews',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  request: {
    params: PluginSlugSchema,
    body: { content: { 'application/json': { schema: CreateReviewSchema } } },
  },
  responses: {
    201: successResponse(ReviewSchema, 'Submit review'),
    404: errorResponse('Plugin not found'),
    409: errorResponse('Already reviewed'),
  },
})

const getReviewsRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}/reviews',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(z.array(ReviewSchema), 'List reviews'),
  },
})

const deleteReviewRoute = createRoute({
  method: 'delete',
  path: '/plugins/{slug}/reviews/{reviewId}',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  request: {
    params: ReviewIdParamsSchema,
  },
  responses: {
    200: successResponse(ReviewDeleteResponseSchema, 'Review deleted'),
    404: errorResponse('Review not found'),
    403: errorResponse('Forbidden'),
  },
})

const trackInstallRoute = createRoute({
  method: 'post',
  path: '/plugins/{slug}/install',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginDeleteResponseSchema, 'Install tracked'),
    404: errorResponse('Plugin not found'),
  },
})

const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['plugins'],
  responses: {
    200: successResponse(z.array(CategorySchema), 'List categories'),
  },
})

const getPluginsByCategoryRoute = createRoute({
  method: 'get',
  path: '/categories/{slug}/plugins',
  tags: ['plugins'],
  request: {
    params: CategorySlugParamsSchema,
    query: CategoryPluginsQuerySchema,
  },
  responses: {
    200: successResponse(PluginListResponseSchema, 'Plugins by category'),
    404: errorResponse('Category not found'),
  },
})

const getStatsRoute = createRoute({
  method: 'get',
  path: '/stats',
  tags: ['plugins'],
  responses: {
    200: successResponse(MarketplaceStatsSchema, 'Marketplace stats'),
  },
})

const listMyPluginsRoute = createRoute({
  method: 'get',
  path: '/plugins/mine',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  responses: {
    200: successResponse(z.array(PluginSchema), 'My plugins'),
  },
})

export const pluginRoutes = new OpenAPIHono()
  .openapi(listMyPluginsRoute, async c => {
    const user = getAuthUser(c)
    const plugins = await queryService.listMyPlugins(user.id)
    return c.json(success(plugins), 200)
  })
  .openapi(listRoute, async c => {
    const query = c.req.valid('query')
    const result = await queryService.listPlugins({
      page: query.page,
      limit: query.limit,
      status: query.status,
      sort: query.sort,
      featured: query.featured,
    })
    return c.json(success(result), 200)
  })
  .openapi(searchRoute, async c => {
    const { q, page, limit, category } = c.req.valid('query')
    const result = await queryService.searchPlugins(q, { page, limit, category })
    return c.json(success(result), 200)
  })
  .openapi(getBySlugRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await queryService.getPluginBySlug(slug)
    return c.json(success(plugin), 200)
  })
  .openapi(getVersionsRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await queryService.getPluginBySlug(slug)
    const versions = await queryService.getVersions(plugin.id)
    return c.json(success(versions), 200)
  })
  .openapi(createRouteDef, async c => {
    const data = c.req.valid('json')
    const user = getAuthUser(c)
    const plugin = await pluginService.createPlugin({
      ...data,
      authorId: user.id,
      authorName: user.username,
    })
    return c.json(created(plugin), 201)
  })
  .openapi(updateRoute, async c => {
    const { slug } = c.req.valid('param')
    const data = c.req.valid('json')
    const user = getAuthUser(c)
    const plugin = await pluginService.updatePlugin(slug, data, user.id)
    return c.json(success(plugin), 200)
  })
  .openapi(deleteRoute, async c => {
    const { slug } = c.req.valid('param')
    const user = getAuthUser(c)
    await pluginService.deletePlugin(slug, user.id)
    return c.json(success({ slug }), 200)
  })
  .openapi(submitReviewRoute, async c => {
    const { slug } = c.req.valid('param')
    const data = c.req.valid('json')
    const user = getAuthUser(c)
    const plugin = await queryService.getPluginBySlug(slug)
    const review = await reviewService.submitReview({
      pluginId: plugin.id,
      userId: user.id,
      userName: user.username,
      rating: data.rating,
      title: data.title,
      content: data.content,
    })
    return c.json(created(review), 201)
  })
  .openapi(getReviewsRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await queryService.getPluginBySlug(slug)
    const reviews = await reviewService.getReviews(plugin.id)
    return c.json(success(reviews), 200)
  })
  .openapi(deleteReviewRoute, async c => {
    const { reviewId } = c.req.valid('param')
    const user = getAuthUser(c)
    await reviewService.deleteReview(reviewId, user.id)
    return c.json(success({ id: reviewId }), 200)
  })
  .openapi(trackInstallRoute, async c => {
    const { slug } = c.req.valid('param')
    await pluginService.trackInstall(slug)
    return c.json(success({ slug }), 200)
  })
  .openapi(listCategoriesRoute, async c => {
    const categories = await queryService.listCategories()
    return c.json(success(categories), 200)
  })
  .openapi(getPluginsByCategoryRoute, async c => {
    const { slug } = c.req.valid('param')
    const { page, limit } = c.req.valid('query')
    const result = await queryService.getPluginsByCategory(slug, { page, limit })
    return c.json(success(result), 200)
  })
  .openapi(getStatsRoute, async c => {
    const stats = await queryService.getStats()
    return c.json(success(stats), 200)
  })
