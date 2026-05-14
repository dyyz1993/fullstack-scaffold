import { z } from '@hono/zod-openapi'

export const DashboardStatSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.number(),
})

export const RevenueDataSchema = z.object({
  month: z.string(),
  value: z.number(),
})

export const ActivityStatusSchema = z.enum(['Active', 'Pending', 'Inactive'])

export const ActivitySchema = z.object({
  id: z.number(),
  user: z.string(),
  action: z.string(),
  date: z.string(),
  status: ActivityStatusSchema,
})

export const DashboardResponseSchema = z.object({
  stats: z.array(DashboardStatSchema),
  revenue: z.array(RevenueDataSchema),
  userGrowth: z.array(RevenueDataSchema),
  activity: z.array(ActivitySchema),
})

export type DashboardStat = z.infer<typeof DashboardStatSchema>
export type RevenueData = z.infer<typeof RevenueDataSchema>
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>
export type Activity = z.infer<typeof ActivitySchema>
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>
