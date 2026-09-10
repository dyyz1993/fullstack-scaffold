import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as todoService from '../services/todo-service'
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdResponseSchema,
  TodoAttachmentSchema,
  TodoAttachmentListSchema,
  TodoWithAttachmentsSchema,
  UploadFileSchema,
  AttachmentIdResponseSchema,
  TodoListResponseSchema,
  TodoListQuerySchema,
} from '@shared/schemas'
import { successResponse, errorResponse, success, created } from '@server/utils/route-helpers'
import { getAuthUser } from '@server/utils/auth'
import { NotFoundError, ValidationError } from '@server/utils/app-error'
import { authMiddleware } from '@server/middleware/auth'

// 租户上下文：仅含 tenant 模块的 preset 由隔离中间件注入 c.tenant。
// 松散读取避免依赖各 preset 差异化的 AppBindings 类型声明
type TenantContext = { id: number } | undefined
function tenantIdFrom(c: { get?: (key: string) => unknown }): number | undefined {
  const tenant = c.get?.('tenant') as TenantContext
  return tenant?.id
}

const listRoute = createRoute({
  method: 'get',
  path: '/todos',
  tags: ['todos'],
  request: {
    query: TodoListQuerySchema,
  },
  responses: {
    200: successResponse(TodoListResponseSchema, 'List all todos'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/todos/{id}',
  tags: ['todos'],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TodoSchema, 'Get a todo by ID'),
    404: errorResponse('Todo not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/todos',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    body: {
      content: { 'application/json': { schema: CreateTodoSchema } },
    },
  },
  responses: {
    201: successResponse(TodoSchema, 'Create a new todo'),
    400: errorResponse('Invalid input'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/todos/{id}',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: {
      content: { 'application/json': { schema: UpdateTodoSchema } },
    },
  },
  responses: {
    200: successResponse(TodoSchema, 'Update a todo'),
    404: errorResponse('Todo not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/todos/{id}',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TodoIdResponseSchema, 'Delete a todo'),
    404: errorResponse('Todo not found'),
  },
})

const uploadAttachmentRoute = createRoute({
  method: 'post',
  path: '/todos/{id}/attachments',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: UploadFileSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(TodoAttachmentSchema, 'File uploaded successfully'),
    404: errorResponse('Todo not found'),
    400: errorResponse('Invalid file or file too large'),
  },
})

const listAttachmentsRoute = createRoute({
  method: 'get',
  path: '/todos/{id}/attachments',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TodoAttachmentListSchema, 'List attachments'),
    404: errorResponse('Todo not found'),
  },
})

const getTodoWithAttachmentsRoute = createRoute({
  method: 'get',
  path: '/todos/{id}/with-attachments',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TodoWithAttachmentsSchema, 'Get todo with attachments'),
    404: errorResponse('Todo not found'),
  },
})

const deleteAttachmentRoute = createRoute({
  method: 'delete',
  path: '/todos/{todoId}/attachments/{attachmentId}',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      todoId: z.coerce.number().int().positive(),
      attachmentId: z.coerce.number().int().positive(),
    }),
  },
  responses: {
    200: successResponse(AttachmentIdResponseSchema, 'Attachment deleted'),
    404: errorResponse('Attachment not found'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const { page, limit } = c.req.valid('query')
    const result = await todoService.listTodos({ page, limit, tenantId: tenantIdFrom(c) })
    return c.json(success(result), 200)
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const todo = await todoService.getTodo(id)
    if (!todo) throw new NotFoundError('Todo', String(id))
    return c.json(success(todo), 200)
  })
  .openapi(createRouteDef, async c => {
    const data = c.req.valid('json')
    const todo = await todoService.createTodo(data, tenantIdFrom(c))
    return c.json(created(todo), 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const todo = await todoService.updateTodo(id, data)
    if (!todo) throw new NotFoundError('Todo', String(id))
    return c.json(success(todo), 200)
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await todoService.deleteTodo(id)
    if (!result) throw new NotFoundError('Todo', String(id))
    return c.json(success({ id }), 200)
  })
  .openapi(uploadAttachmentRoute, async c => {
    const { id } = c.req.valid('param')

    const todo = await todoService.getTodo(id)
    if (!todo) throw new NotFoundError('Todo', String(id))

    const body = c.req.valid('form')
    const file = body['file']

    if (!file || !(file instanceof File)) {
      throw new ValidationError('No file uploaded')
    }

    const user = getAuthUser(c)
    const arrayBuffer = await file.arrayBuffer()

    try {
      const attachment = await todoService.uploadAttachment(
        id,
        {
          name: file.name,
          type: file.type,
          size: file.size,
          data: arrayBuffer,
        },
        user?.id
      )

      return c.json(created(attachment), 201)
    } catch (error) {
      throw new ValidationError((error as Error).message)
    }
  })
  .openapi(listAttachmentsRoute, async c => {
    const { id } = c.req.valid('param')

    const todo = await todoService.getTodo(id)
    if (!todo) throw new NotFoundError('Todo', String(id))

    const attachments = await todoService.listAttachments(id)
    return c.json(success(attachments), 200)
  })
  .openapi(getTodoWithAttachmentsRoute, async c => {
    const { id } = c.req.valid('param')
    const todo = await todoService.getTodoWithAttachments(id)
    if (!todo) throw new NotFoundError('Todo', String(id))
    return c.json(success(todo), 200)
  })
  .openapi(deleteAttachmentRoute, async c => {
    const { attachmentId } = c.req.valid('param')
    const result = await todoService.deleteAttachment(attachmentId)
    if (!result) throw new NotFoundError('Attachment', String(attachmentId))
    return c.json(success({ id: attachmentId }), 200)
  })
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Todo API',
    },
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type TodosApiType = typeof apiRoutes
