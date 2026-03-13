import { z } from '@hono/zod-openapi'

export const RoleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().optional().nullable(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateRoleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
})

export const UpdateRoleSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
})

export const UpdateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
})

export const SuccessSchema = z.object({
  success: z.literal(true),
})

export type RoleType = z.infer<typeof RoleSchema>
export type CreateRoleType = z.infer<typeof CreateRoleSchema>
export type UpdateRoleType = z.infer<typeof UpdateRoleSchema>
