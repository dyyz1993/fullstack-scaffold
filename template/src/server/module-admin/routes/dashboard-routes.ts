import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse } from '@server/utils/route-helpers'
import { DashboardResponseSchema } from '@shared/schemas'

const getDashboardStatsRoute = createRoute({
  method: 'get',
  path: '/admin/dashboard/stats',
  responses: {
    200: successResponse(DashboardResponseSchema, 'Dashboard stats'),
  },
})

export const dashboardRoutes = new OpenAPIHono().openapi(getDashboardStatsRoute, async c => {
  return c.json({
    success: true as const,
    data: {
      stats: [
        { label: 'Total Users', value: '12,847', trend: 12.5 },
        { label: 'Active Users', value: '8,234', trend: 8.2 },
        { label: 'Revenue', value: '$48,293', trend: -2.4 },
        { label: 'Conversion', value: '3.2%', trend: 4.1 },
      ],
      revenue: [
        { month: 'Jan', value: 65 },
        { month: 'Feb', value: 45 },
        { month: 'Mar', value: 78 },
        { month: 'Apr', value: 52 },
        { month: 'May', value: 90 },
        { month: 'Jun', value: 70 },
      ],
      userGrowth: [
        { month: 'Jan', value: 30 },
        { month: 'Feb', value: 45 },
        { month: 'Mar', value: 55 },
        { month: 'Apr', value: 60 },
        { month: 'May', value: 72 },
        { month: 'Jun', value: 85 },
      ],
      activity: [
        {
          id: 1,
          user: 'Sarah Chen',
          action: 'Upgraded to Pro plan',
          date: '2024-01-15',
          status: 'Active' as const,
        },
        {
          id: 2,
          user: 'Mike Johnson',
          action: 'Submitted support ticket',
          date: '2024-01-14',
          status: 'Pending' as const,
        },
        {
          id: 3,
          user: 'Emily Davis',
          action: 'Cancelled subscription',
          date: '2024-01-13',
          status: 'Inactive' as const,
        },
        {
          id: 4,
          user: 'Alex Turner',
          action: 'Registered new account',
          date: '2024-01-12',
          status: 'Active' as const,
        },
        {
          id: 5,
          user: 'Lisa Park',
          action: 'Updated billing info',
          date: '2024-01-11',
          status: 'Active' as const,
        },
      ],
    },
  })
})
