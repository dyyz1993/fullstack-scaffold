import { z } from '@hono/zod-openapi'

export const DeveloperProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.string().datetime(),
})

export const LoginSchema = z
  .object({
    account: z.string().nullish(),
    email: z.string().email().nullish(),
    password: z.string().min(6),
  })
  .refine(data => data.account || data.email, {
    message: 'Either account or email is required',
    path: ['account'],
  })

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
})

export const TokenResponseSchema = z.object({
  token: z.string(),
  profile: DeveloperProfileSchema,
})

export type DeveloperProfile = z.infer<typeof DeveloperProfileSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type TokenResponse = z.infer<typeof TokenResponseSchema>
