import { z } from '@hono/zod-openapi'

export const RoleEnum = z.enum(['super_admin', 'customer_service', 'user'])

export const RoleInfoSchema = z.object({
  role: RoleEnum,
  label: z.string(),
  permissions: z.array(z.string()),
})

export const PermissionInfoSchema = z.object({
  permission: z.string(),
  label: z.string(),
  category: z.string(),
})

export const UserPermissionsSchema = z.object({
  userId: z.string(),
  role: RoleEnum,
  permissions: z.array(z.string()),
})

export const RoleListSchema = z.array(RoleInfoSchema)

export const PermissionListSchema = z.array(PermissionInfoSchema)

export type RoleType = z.infer<typeof RoleEnum>
export type RoleInfo = z.infer<typeof RoleInfoSchema>
export type PermissionInfo = z.infer<typeof PermissionInfoSchema>
export type UserPermissions = z.infer<typeof UserPermissionsSchema>
