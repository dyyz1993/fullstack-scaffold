import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as notificationService from '../services/notification-service';
import { initRealtimeService } from '../../services/realtime';
import {
  NotificationSchema,
  CreateNotificationSchema,
} from '@shared/schemas';

const NotificationListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(NotificationSchema),
  nextCursor: z.string().optional(),
});

const UnreadCountResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    count: z.number(),
  }),
});

const MarkAllReadResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    count: z.number(),
  }),
});

const ErrorResponseSchema = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
});

const listRoute = createRoute({
  method: 'get',
  path: '/notifications',
  tags: ['notifications'],
  request: {
    query: z.object({
      unreadOnly: z.string().optional(),
      limit: z.string().optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: NotificationListResponseSchema,
        },
      },
      description: 'List notifications',
    },
  },
});

const getRoute = createRoute({
  method: 'get',
  path: '/notifications/{id}',
  tags: ['notifications'],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: NotificationSchema,
          }),
        },
      },
      description: 'Get notification by ID',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Notification not found',
    },
  },
});

const createRouteDef = createRoute({
  method: 'post',
  path: '/notifications',
  tags: ['notifications'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateNotificationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: NotificationSchema,
          }),
        },
      },
      description: 'Create notification',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid input',
    },
  },
});

const markReadRoute = createRoute({
  method: 'patch',
  path: '/notifications/{id}/read',
  tags: ['notifications'],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: NotificationSchema,
          }),
        },
      },
      description: 'Mark as read',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Notification not found',
    },
  },
});

const markAllReadRoute = createRoute({
  method: 'patch',
  path: '/notifications/read-all',
  tags: ['notifications'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MarkAllReadResponseSchema,
        },
      },
      description: 'Mark all as read',
    },
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/notifications/{id}',
  tags: ['notifications'],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              id: z.string(),
            }),
          }),
        },
      },
      description: 'Delete notification',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Notification not found',
    },
  },
});

const unreadCountRoute = createRoute({
  method: 'get',
  path: '/notifications/unread-count',
  tags: ['notifications'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UnreadCountResponseSchema,
        },
      },
      description: 'Get unread count',
    },
  },
});

export const notificationRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => {
    const query = c.req.valid('query');
    const result = notificationService.listNotifications({
      unreadOnly: query.unreadOnly === 'true',
      limit: query.limit ? parseInt(query.limit) : 20,
      cursor: query.cursor,
    });
    return c.json({ success: true, data: result.data, nextCursor: result.nextCursor });
  })
  .openapi(getRoute, async (c) => {
    const { id } = c.req.valid('param');
    const notification = notificationService.getNotification(id);
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }
    return c.json({ success: true, data: notification });
  })
  .openapi(createRouteDef, async (c) => {
    const data = c.req.valid('json');
    const notification = notificationService.createNotification(data);
    
    const env = c.env as { NOTIFICATION_DO?: DurableObjectNamespace };
    const realtime = initRealtimeService(env);
    await realtime.broadcastNotification(notification);
    
    return c.json({ success: true, data: notification }, 201);
  })
  .openapi(markReadRoute, async (c) => {
    const { id } = c.req.valid('param');
    const notification = notificationService.markAsRead(id);
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }
    return c.json({ success: true, data: notification });
  })
  .openapi(markAllReadRoute, async (c) => {
    const count = notificationService.markAllAsRead();
    return c.json({ success: true, data: { count } });
  })
  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.valid('param');
    const deleted = notificationService.deleteNotification(id);
    if (!deleted) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }
    return c.json({ success: true, data: { id } });
  })
  .openapi(unreadCountRoute, async (c) => {
    const count = notificationService.getUnreadCount();
    return c.json({ success: true, data: { count } });
  });
