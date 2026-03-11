import { z } from '@hono/zod-openapi'

export const SystemStatsSchema = z.object({
  totalTodos: z.number(),
  pendingTodos: z.number(),
  completedTodos: z.number(),
  lastUpdated: z.string(),
})

export const HealthCheckSchema = z.object({
  database: z.enum(['connected', 'disconnected']),
  timestamp: z.string(),
})

export const RecentActivityItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  updatedAt: z.string(),
})

export const RecentActivitySchema = z.array(RecentActivityItemSchema)

export const AuthUserSchema = z.object({
  id: z.string(),
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()),
})

export const ClearTodosResultSchema = z.object({
  deletedCount: z.number(),
})

export type SystemStats = z.infer<typeof SystemStatsSchema>
export type HealthCheck = z.infer<typeof HealthCheckSchema>
export type RecentActivityItem = z.infer<typeof RecentActivityItemSchema>
export type AuthUserResponse = z.infer<typeof AuthUserSchema>
export type ClearTodosResult = z.infer<typeof ClearTodosResultSchema>
