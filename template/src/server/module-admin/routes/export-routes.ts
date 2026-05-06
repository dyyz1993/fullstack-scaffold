import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '@server/middleware/auth'
import * as adminService from '../services/admin-service'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { sanitizeCsvField } from '@server/utils/file-storage'
import { DownloadTokenSchema } from '@shared/modules/admin'

const downloadTokens = new Map<string, { createdAt: number; expiresIn: number }>()

const generateDownloadToken = () => {
  const token =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  downloadTokens.set(token, { createdAt: Date.now(), expiresIn: 60000 })
  setTimeout(() => downloadTokens.delete(token), 60000)
  return token
}

const isValidDownloadToken = (token: string) => {
  const data = downloadTokens.get(token)
  if (!data) return false
  if (Date.now() - data.createdAt > data.expiresIn) {
    downloadTokens.delete(token)
    return false
  }
  return true
}

const consumeDownloadToken = (token: string) => {
  const valid = isValidDownloadToken(token)
  if (valid) {
    downloadTokens.delete(token)
  }
  return valid
}

const exportTodosRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export',
  tags: ['export'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: {
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
        'text/csv': { schema: z.string() },
      },
      description: 'Export todos as Excel or CSV',
    },
    401: errorResponse('Unauthorized'),
  },
})

const generateDownloadTokenRoute = createRoute({
  method: 'post',
  path: '/admin/todos/export/token',
  tags: ['export'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(DownloadTokenSchema, 'Generate a temporary download token'),
    401: errorResponse('Unauthorized'),
  },
})

const downloadWithTokenRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export/download/:token',
  tags: ['export'],
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'text/csv': { schema: z.string() },
      },
      description: 'Download CSV with temporary token',
    },
    403: errorResponse('Invalid or expired token'),
  },
})

const exportTodosStreamRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export/stream',
  tags: ['export'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: {
      content: {
        'text/csv': { schema: z.string() },
      },
      description: 'Stream export todos as CSV (for large datasets)',
    },
    401: errorResponse('Unauthorized'),
  },
})

export const exportRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(exportTodosRoute, async _c => {
    const todos = await adminService.getAllTodos()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('id,title,completed,created_at\n'))

        for (const todo of todos) {
          const line = `${sanitizeCsvField(String(todo.id))},${sanitizeCsvField(todo.title)},${todo.completed},${sanitizeCsvField(todo.createdAt)}\n`
          controller.enqueue(encoder.encode(line))
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos.csv"',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  })
  .openapi(generateDownloadTokenRoute, async c => {
    const token = generateDownloadToken()
    const downloadUrl = `/api/admin/todos/export/download/${token}`
    return c.json(
      success({
        token,
        downloadUrl,
        expiresIn: 60000,
      }),
      200
    )
  })
  .openapi(downloadWithTokenRoute, async c => {
    const { token } = c.req.valid('param')

    if (!consumeDownloadToken(token)) {
      return c.json({ success: false as const, error: 'Invalid or expired token' }, 403)
    }

    const todos = await adminService.getAllTodos()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('id,title,completed,created_at\n'))

        for (const todo of todos) {
          const line = `${sanitizeCsvField(String(todo.id))},${sanitizeCsvField(todo.title)},${todo.completed},${sanitizeCsvField(todo.createdAt)}\n`
          controller.enqueue(encoder.encode(line))
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos.csv"',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  })
  .openapi(exportTodosStreamRoute, async _c => {
    const todos = await adminService.getAllTodos()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('id,title,completed,created_at\n'))

        for (let i = 0; i < todos.length; i++) {
          const todo = todos[i]
          const line = `${sanitizeCsvField(String(todo.id))},${sanitizeCsvField(todo.title)},${todo.completed},${sanitizeCsvField(todo.createdAt)}\n`
          controller.enqueue(encoder.encode(line))

          await new Promise(resolve => setTimeout(resolve, 300))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos-stream.csv"',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  })
