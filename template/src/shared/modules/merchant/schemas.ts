import { z } from '@hono/zod-openapi'

// ==================== Merchant Schemas ====================

export const MerchantSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  tenantId: z.number().int().positive(),
  businessName: z.string().min(1).max(200),
  businessType: z.enum(['retail', 'wholesale', 'service', 'restaurant']),
  status: z.enum(['active', 'inactive', 'suspended']),
  description: z.string().max(1000).nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().max(500).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const MerchantLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
})

export const MerchantStatsSchema = z.object({
  totalOrders: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  totalProducts: z.number().int().min(0),
  activeProducts: z.number().int().min(0),
  pendingOrders: z.number().int().min(0),
  thisMonthRevenue: z.number().min(0),
})

export type Merchant = z.infer<typeof MerchantSchema>
export type MerchantLoginInput = z.infer<typeof MerchantLoginSchema>
export type MerchantStats = z.infer<typeof MerchantStatsSchema>

export const MerchantLoginResponseSchema = z.object({
  token: z.string(),
  merchant: MerchantSchema,
})

export type MerchantLoginResponse = z.infer<typeof MerchantLoginResponseSchema>

// ==================== Product Schemas ====================

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

// ==================== Product Query Schemas ====================

export const ProductQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'out_of_stock']).nullish(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type ProductQuery = z.infer<typeof ProductQuerySchema>

export const ProductListResponseSchema = z.object({
  items: ProductListSchema,
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type ProductListResponse = z.infer<typeof ProductListResponseSchema>
