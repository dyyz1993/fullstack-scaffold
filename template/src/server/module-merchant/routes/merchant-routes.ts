import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as merchantService from '../services/merchant-service'
import {
  MerchantSchema,
  MerchantLoginSchema,
  MerchantStatsSchema,
  MerchantLoginResponseSchema,
  ProductSchema,
  CreateProductSchema,
  ProductListResponseSchema,
  ProductQuerySchema,
} from '@shared/schemas'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { NotFoundError } from '@server/utils/app-error'
import { authMiddleware } from '@server/middleware/auth'

// ==================== Merchant Routes ====================

const getMeRoute = createRoute({
  method: 'get',
  path: '/merchant/me',
  tags: ['merchants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(MerchantSchema, 'Get current merchant'),
    404: errorResponse('Merchant not found'),
  },
})

const loginRoute = createRoute({
  method: 'post',
  path: '/merchant/login',
  tags: ['merchants'],
  request: {
    body: {
      content: { 'application/json': { schema: MerchantLoginSchema } },
    },
  },
  responses: {
    200: successResponse(MerchantLoginResponseSchema, 'Login successful'),
    401: errorResponse('Invalid credentials'),
  },
})

const getStatsRoute = createRoute({
  method: 'get',
  path: '/merchant/stats',
  tags: ['merchants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(MerchantStatsSchema, 'Get merchant statistics'),
  },
})

// ==================== Product Routes ====================

const listProductsRoute = createRoute({
  method: 'get',
  path: '/merchant/products',
  tags: ['merchants', 'products'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    query: ProductQuerySchema,
  },
  responses: {
    200: successResponse(ProductListResponseSchema, 'List merchant products'),
  },
})

const createProductRoute = createRoute({
  method: 'post',
  path: '/merchant/products',
  tags: ['merchants', 'products'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    body: {
      content: { 'application/json': { schema: CreateProductSchema } },
    },
  },
  responses: {
    201: successResponse(ProductSchema, 'Create a new product'),
    400: errorResponse('Invalid input'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(getMeRoute, async c => {
    const authUser = c.get('authUser')
    const merchant = await merchantService.getMerchantByUserId(authUser.id)
    if (!merchant) throw new NotFoundError('Merchant')
    return c.json(success(merchant), 200)
  })
  .openapi(loginRoute, async c => {
    try {
      const credentials = c.req.valid('json')
      const result = await merchantService.merchantLogin(credentials)
      return c.json(success(result), 200)
    } catch (error) {
      // Handle authentication errors
      if (error instanceof Error) {
        return c.json({ success: false, error: error.message }, 401)
      }
      return c.json({ success: false, error: 'Login failed' }, 500)
    }
  })
  .openapi(getStatsRoute, async c => {
    const authUser = c.get('authUser')
    const merchant = await merchantService.getMerchantByUserId(authUser.id)
    if (!merchant) throw new NotFoundError('Merchant')
    const stats = await merchantService.getMerchantStats(merchant.id)
    return c.json(success(stats), 200)
  })
  .openapi(listProductsRoute, async c => {
    const authUser = c.get('authUser')
    const merchant = await merchantService.getMerchantByUserId(authUser.id)
    if (!merchant) throw new NotFoundError('Merchant')
    const query = c.req.valid('query')
    const result = await merchantService.listProducts(
      merchant.id,
      query.page,
      query.pageSize,
      query.status ?? undefined
    )
    return c.json(success(result), 200)
  })
  .openapi(createProductRoute, async c => {
    const authUser = c.get('authUser')
    const merchant = await merchantService.getMerchantByUserId(authUser.id)
    if (!merchant) throw new NotFoundError('Merchant')
    const input = c.req.valid('json')
    const product = await merchantService.createProduct(merchant.id, input)
    return c.json(success(product), 201)
  })
