import { z } from '@hono/zod-openapi'
import { RoleEnum, PermissionEnum } from '@platform/shared/permission'

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: RoleEnum,
  avatar: z.string().nullish(),
  permissions: z.array(PermissionEnum),
})

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
})

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  token: z.string(),
})

export const RegisterRequestSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: RoleEnum,
  status: z.enum(['active', 'inactive', 'locked']),
  avatar: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UserListSchema = z.array(UserSchema)

export const UpdateUserRequestSchema = z.object({
  username: z.string().nullish(),
  email: z.string().email().nullish(),
  role: RoleEnum.nullish(),
  status: z.enum(['active', 'inactive', 'locked']).nullish(),
})

export const CreateUserRequestSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: RoleEnum,
  status: z.enum(['active', 'inactive', 'locked']).nullish().default('active'),
})

export type AuthUserResponse = z.infer<typeof AuthUserSchema>
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>
export type User = z.infer<typeof UserSchema>
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>
