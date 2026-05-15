import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse } from '@server/utils/route-helpers'
import { ECommerceOrderListSchema } from '@shared/schemas'

const MOCK_ORDERS = [
  {
    id: 'ORD-2024-001',
    date: '2024-12-10',
    status: 'processing' as const,
    products: [
      { name: 'Wireless Headphones', color: '#374151' },
      { name: 'USB-C Cable', color: '#6366f1' },
    ],
    total: 94.98,
  },
  {
    id: 'ORD-2024-002',
    date: '2024-12-08',
    status: 'shipped' as const,
    products: [
      { name: 'Organic Cotton T-Shirt', color: '#6ee7b7' },
      { name: 'Ceramic Travel Mug', color: '#f59e0b' },
      { name: 'Linen Tote Bag', color: '#d4a574' },
    ],
    total: 79.97,
  },
  {
    id: 'ORD-2024-003',
    date: '2024-12-01',
    status: 'delivered' as const,
    products: [
      { name: 'Bamboo Desk Organizer', color: '#a3e635' },
      { name: 'Recycled Notebook', color: '#f472b6' },
    ],
    total: 45.98,
  },
  {
    id: 'ORD-2024-004',
    date: '2024-11-25',
    status: 'delivered' as const,
    products: [{ name: 'Beeswax Candle Set', color: '#fbbf24' }],
    total: 29.99,
  },
  {
    id: 'ORD-2024-005',
    date: '2024-11-20',
    status: 'cancelled' as const,
    products: [
      { name: 'Wooden Phone Stand', color: '#92400e' },
      { name: 'Plant-Based Soap', color: '#86efac' },
    ],
    total: 39.98,
  },
]

const getOrdersRoute = createRoute({
  method: 'get',
  path: '/orders-mock',
  responses: {
    200: successResponse(ECommerceOrderListSchema, 'List e-commerce orders'),
  },
})

export const ordersMockRoutes = new OpenAPIHono().openapi(getOrdersRoute, async c => {
  return c.json({ success: true as const, data: MOCK_ORDERS })
})
