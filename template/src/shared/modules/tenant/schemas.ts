import { z } from '@hono/zod-openapi'
import { TENANT_PERMISSION_VALUES } from './permissions'

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
  // 可选：建租户时通常没有初始配置，service 层兜底空对象
  settings: TenantSettingsSchema.nullish().default({}),
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

// ============ 租户角色 ============
export const TenantRoleSchema = z.object({
  id: z.string(),
  tenantId: z.number().int().positive(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  description: z.string().nullish(),
  permissions: z.array(z.enum(TENANT_PERMISSION_VALUES as [string, ...string[]])),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type TenantRole = z.infer<typeof TenantRoleSchema>

export const CreateTenantRoleSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  description: z.string().nullish(),
  permissions: z.array(z.enum(TENANT_PERMISSION_VALUES as [string, ...string[]])).min(1),
})

export type CreateTenantRoleInput = z.infer<typeof CreateTenantRoleSchema>

export const UpdateTenantRoleSchema = z.object({
  label: z.string().min(1).max(100).nullish(),
  description: z.string().nullish(),
  permissions: z
    .array(z.enum(TENANT_PERMISSION_VALUES as [string, ...string[]]))
    .min(1)
    .nullish(),
})

export type UpdateTenantRoleInput = z.infer<typeof UpdateTenantRoleSchema>

// ============ 租户成员 ============
export const TenantMemberSchema = z.object({
  id: z.string(),
  tenantId: z.number().int().positive(),
  userId: z.string(),
  roleId: z.string(),
  /** 展示名：developers 表用户名，dev token 用户回退 userId */
  username: z.string().nullish(),
  role: TenantRoleSchema.nullish(),
  status: z.enum(['active', 'pending', 'suspended', 'left']),
  invitedBy: z.string().nullish(),
  invitedAt: z.string().datetime().nullish(),
  joinedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().nullish(),
})

export type TenantMember = z.infer<typeof TenantMemberSchema>

export const UpdateMemberRoleSchema = z.object({
  roleId: z.string().min(1),
})

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>

// ============ 租户邀请 ============
export const TenantInvitationSchema = z.object({
  id: z.string(),
  tenantId: z.number().int().positive(),
  email: z.string().email(),
  roleId: z.string(),
  inviterId: z.string(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired', 'cancelled']),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullish(),
  createdAt: z.string().datetime(),
})

export type TenantInvitation = z.infer<typeof TenantInvitationSchema>

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
})

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>

/** 邀请详情（公开接口）：脱敏后返回，不含 inviterId */
export const PublicInvitationSchema = z.object({
  tenantName: z.string(),
  tenantSlug: z.string(),
  email: z.string().email(),
  roleLabel: z.string(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired', 'cancelled']),
  expiresAt: z.string().datetime(),
})

export type PublicInvitation = z.infer<typeof PublicInvitationSchema>

// ============ 列表/ID 响应包装（路由 responses 不得内联 schema） ============
export const StringIdResponseSchema = z.object({ id: z.string() })
export type StringIdResponse = z.infer<typeof StringIdResponseSchema>

export const TenantArrayResponseSchema = z.array(TenantSchema)
export const TenantRoleArrayResponseSchema = z.array(TenantRoleSchema)
export const TenantMemberArrayResponseSchema = z.array(TenantMemberSchema)
