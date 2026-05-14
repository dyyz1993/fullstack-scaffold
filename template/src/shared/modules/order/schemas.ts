import { z } from '@hono/zod-openapi'

export const OrderStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'cancelled',
  'disputed',
])

export const OrderSchema = z.object({
  id: z.string(),
  orderNo: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  productName: z.string(),
  amount: z.number(),
  status: OrderStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateOrderSchema = z.object({
  customerName: z.string(),
  customerEmail: z.string().email(),
  productName: z.string(),
  amount: z.number().positive(),
})

export const UpdateOrderSchema = z.object({
  status: OrderStatusSchema.nullish(),
})

export const OrderListSchema = z.array(OrderSchema)

export const OrderQuerySchema = z.object({
  status: OrderStatusSchema.nullish(),
  customerName: z.string().nullish(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const DeleteResultSchema = z.object({
  message: z.string(),
})

export const ProcessOrderSchema = z.object({
  orderId: z.string(),
})

export const CancelOrderSchema = z.object({
  orderId: z.string(),
  reason: z.string().nullish(),
})

export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type Order = z.infer<typeof OrderSchema>
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>
export type DeleteResult = z.infer<typeof DeleteResultSchema>
export type ProcessOrderInput = z.infer<typeof ProcessOrderSchema>
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>
export type OrderQueryInput = z.infer<typeof OrderQuerySchema>

export const RemoveCartItemResponseSchema = z.object({ removedId: z.string() })

export const ECommerceProductSchema = z.object({
  name: z.string(),
  color: z.string(),
})

export const ECommerceOrderStatusSchema = z.enum([
  'processing',
  'shipped',
  'delivered',
  'cancelled',
])

export const ECommerceOrderSchema = z.object({
  id: z.string(),
  date: z.string(),
  status: ECommerceOrderStatusSchema,
  products: z.array(ECommerceProductSchema),
  total: z.number(),
})

export const ECommerceOrderListSchema = z.array(ECommerceOrderSchema)

export type RemoveCartItemResponse = z.infer<typeof RemoveCartItemResponseSchema>
export type ECommerceProduct = z.infer<typeof ECommerceProductSchema>
export type ECommerceOrderStatus = z.infer<typeof ECommerceOrderStatusSchema>
export type ECommerceOrder = z.infer<typeof ECommerceOrderSchema>
