import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import { z } from '@hono/zod-openapi'
import {
  CartItemSchema,
  CartResponseSchema,
  AddCartItemSchema,
  RemoveCartItemResponseSchema,
} from '@shared/schemas'

const SHIPPING_THRESHOLD = 50
const TAX_RATE = 0.08

const MOCK_CART_ITEMS = [
  {
    id: 1,
    name: 'Wireless Headphones',
    variant: 'Black',
    price: 79.99,
    quantity: 1,
    color: '#374151',
  },
  {
    id: 2,
    name: 'Organic Cotton T-Shirt',
    variant: 'Medium / Sage',
    price: 34.99,
    quantity: 2,
    color: '#6ee7b7',
  },
  {
    id: 3,
    name: 'Ceramic Travel Mug',
    variant: 'Amber / 350ml',
    price: 24.99,
    quantity: 1,
    color: '#f59e0b',
  },
]

function computeSummary(items: typeof MOCK_CART_ITEMS) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : 5.99
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  return { subtotal, shipping, tax, total, totalItems }
}

const getCartRoute = createRoute({
  method: 'get',
  path: '/cart',
  responses: {
    200: successResponse(CartResponseSchema, 'Get cart'),
  },
})

const addCartItemRoute = createRoute({
  method: 'post',
  path: '/cart/items',
  request: {
    body: {
      content: {
        'application/json': { schema: AddCartItemSchema },
      },
    },
  },
  responses: {
    201: successResponse(CartItemSchema, 'Item added to cart'),
    400: errorResponse('Invalid input'),
  },
})

const removeCartItemRoute = createRoute({
  method: 'delete',
  path: '/cart/items/{id}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(RemoveCartItemResponseSchema, 'Item removed'),
    404: errorResponse('Item not found'),
  },
})

export const cartRoutes = new OpenAPIHono()
  .openapi(getCartRoute, async c => {
    const summary = computeSummary(MOCK_CART_ITEMS)
    return c.json({ success: true as const, data: { items: MOCK_CART_ITEMS, summary } })
  })
  .openapi(addCartItemRoute, async c => {
    const body = c.req.valid('json')
    return c.json({ success: true as const, data: body }, 201)
  })
  .openapi(removeCartItemRoute, async c => {
    const { id } = c.req.valid('param')
    const exists = MOCK_CART_ITEMS.some(item => String(item.id) === id)
    if (!exists) {
      return c.json({ success: false as const, error: 'Item not found' }, 404)
    }
    return c.json({ success: true as const, data: { removedId: id } })
  })
