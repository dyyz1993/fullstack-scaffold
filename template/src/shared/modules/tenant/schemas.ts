import { z } from '@hono/zod-openapi'

export const TenantSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullish(),
  description: z.string().nullish(),
  plan: z.string(),
  status: z.string(),
  maxMembers: z.number().nullish(),
  maxStorage: z.number().nullish(),
  settings: z.string().nullish(),
  metadata: z.string().nullish(),
  ownerId: z.string(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const TenantRoleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  code: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  permissions: z.string(),
  isSystem: z.boolean().nullish(),
  isActive: z.boolean().nullish(),
  sortOrder: z.number().nullish(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const TenantMemberSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  roleId: z.string(),
  status: z.string(),
  invitedBy: z.string().nullish(),
  invitedAt: z.number().nullish(),
  joinedAt: z.number().nullish(),
  lastActiveAt: z.number().nullish(),
  role: TenantRoleSchema,
})

export const InvitationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  roleId: z.string(),
  inviterId: z.string(),
  token: z.string(),
  status: z.string(),
  expiresAt: z.number().nullish(),
  acceptedAt: z.number().nullish(),
  createdAt: z.number().nullish(),
})

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).nullish(),
})

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).nullish(),
  logo: z.string().url().nullish(),
  description: z.string().max(500).nullish(),
  settings: z.string().nullish(),
})

export const CreateTenantRoleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  label: z.string().min(2).max(100),
  description: z.string().max(500).nullish(),
  permissions: z.array(z.string()),
})

export const UpdateTenantRoleSchema = z.object({
  name: z.string().min(2).max(100).nullish(),
  label: z.string().min(2).max(100).nullish(),
  description: z.string().max(500).nullish(),
  permissions: z.array(z.string()).nullish(),
})

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string(),
})

export const UpdateMemberSchema = z.object({
  roleId: z.string(),
})

export const TenantListSchema = z.object({ tenants: z.array(TenantSchema) })
export const TenantRoleListSchema = z.object({ roles: z.array(TenantRoleSchema) })
export const TenantMemberListSchema = z.object({ members: z.array(TenantMemberSchema) })
export const SuccessSchema = z.object({ success: z.literal(true) })
