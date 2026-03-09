import { z } from 'zod'

export const NotificationTypeSchema = z.enum(['info', 'warning', 'success', 'error'])

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().max(2000),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
})

export const CreateNotificationSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
})

export const NotificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
})

export const SSEEventSchema = z.object({
  event: z.enum(['notification', 'ping', 'connected']),
  data: z.union([NotificationSchema, z.object({ timestamp: z.number() })]),
})

export const AppSSEProtocolSchema = z.object({
  events: z.object({
    notification: NotificationSchema,
    ping: z.object({ timestamp: z.number() }),
    connected: z.object({ timestamp: z.number() }),
  }),
})

export type NotificationType = z.infer<typeof NotificationTypeSchema>
export type AppNotification = z.infer<typeof NotificationSchema>
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>
export type SSEEvent = z.infer<typeof SSEEventSchema>
export type AppSSEProtocol = z.infer<typeof AppSSEProtocolSchema>
