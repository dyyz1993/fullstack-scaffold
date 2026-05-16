import { z } from '@hono/zod-openapi'

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  price: z.number().positive(),
  status: z.enum(['active', 'inactive', 'out_of_stock']),
  stock: z.number().int().min(0),
  imageUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  price: z.number().positive(),
  status: z.enum(['active', 'inactive', 'out_of_stock']).default('active'),
  stock: z.number().int().min(0).default(0),
  imageUrl: z.string().url().nullable(),
})

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  description: z.string().max(1000).nullish(),
  price: z.number().positive().nullish(),
  status: z.enum(['active', 'inactive', 'out_of_stock']).nullish(),
  stock: z.number().int().min(0).nullish(),
  imageUrl: z.string().url().nullable().nullish(),
})

export const ProductListSchema = z.array(ProductSchema)

export type Product = z.infer<typeof ProductSchema>
export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
