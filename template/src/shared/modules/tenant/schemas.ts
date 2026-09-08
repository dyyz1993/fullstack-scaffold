import { z } from '@hono/zod-openapi'

export const TenantStatusSchema = z.enum(['active', 'suspended', 'trial'])
export type TenantStatus = z.infer<typeof TenantStatusSchema>

export const TenantPlanSchema = z.enum(['free', 'starter', 'pro', 'enterprise'])
export type TenantPlan = z.infer<typeof TenantPlanSchema>

export const TenantSettingsSchema = z.record(z.string(), z.unknown()).nullable()
export type TenantSettings = z.infer<typeof TenantSettingsSchema>

export const TenantSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  status: TenantStatusSchema,
  plan: TenantPlanSchema,
  maxUsers: z.number().int().min(1).max(1000),
  settings: TenantSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Tenant = z.infer<typeof TenantSchema>

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  plan: TenantPlanSchema.default('free'),
  maxUsers: z.number().int().min(1).max(1000).default(5),
  settings: TenantSettingsSchema,
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  status: TenantStatusSchema.nullish(),
  plan: TenantPlanSchema.nullish(),
  maxUsers: z.number().int().min(1).max(1000).nullish(),
  settings: TenantSettingsSchema.nullish(),
})

export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>

export const TenantIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type TenantId = z.infer<typeof TenantIdSchema>

export const TenantSlugSchema = z.object({
  slug: z.string(),
})

export type TenantSlug = z.infer<typeof TenantSlugSchema>

export const TenantListResponseSchema = z.object({
  items: z.array(TenantSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type TenantListResponse = z.infer<typeof TenantListResponseSchema>

export const TenantIdResponseSchema = z.object({
  id: z.number(),
})

export type TenantIdResponse = z.infer<typeof TenantIdResponseSchema>

export const TenantQuerySchema = z.object({
  status: TenantStatusSchema.nullish(),
  plan: TenantPlanSchema.nullish(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type TenantQuery = z.infer<typeof TenantQuerySchema>
