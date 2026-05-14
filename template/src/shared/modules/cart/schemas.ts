import { z } from '@hono/zod-openapi'

export const CartItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  variant: z.string(),
  price: z.number(),
  quantity: z.number(),
  color: z.string(),
})

export const CartSummarySchema = z.object({
  subtotal: z.number(),
  shipping: z.number(),
  tax: z.number(),
  total: z.number(),
  totalItems: z.number(),
})

export const CartResponseSchema = z.object({
  items: z.array(CartItemSchema),
  summary: CartSummarySchema,
})

export const AddCartItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  variant: z.string(),
  price: z.number(),
  quantity: z.number().min(1).default(1),
  color: z.string(),
})

export const CartItemIdSchema = z.object({
  id: z.string(),
})

export type CartItem = z.infer<typeof CartItemSchema>
export type CartSummary = z.infer<typeof CartSummarySchema>
export type CartResponse = z.infer<typeof CartResponseSchema>
export type AddCartItemInput = z.infer<typeof AddCartItemSchema>
