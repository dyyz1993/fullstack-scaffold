import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as todoService from '../services/todo-service'
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdResponseSchema,
} from '@shared/schemas'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import { authMiddleware } from '../../middleware/auth'
import { Permission } from '@shared/modules/permission'

const TodoListSchema = z.array(TodoSchema)

const listRoute = createRoute({
  method: 'get',
  path: '/todos',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.TODO_VIEW] })],
  responses: {
    200: successResponse(TodoListSchema, 'List all todos'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/todos/{id}',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.TODO_VIEW] })],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(TodoSchema, 'Get a todo by ID'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Todo not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/todos',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.TODO_CREATE] })],
  request: {
    body: {
      content: { 'application/json': { schema: CreateTodoSchema } },
    },
  },
  responses: {
    201: successResponse(TodoSchema, 'Create a new todo'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    400: errorResponse('Invalid input'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/todos/{id}',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.TODO_EDIT] })],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: UpdateTodoSchema } },
    },
  },
  responses: {
    200: successResponse(TodoSchema, 'Update a todo'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Todo not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/todos/{id}',
  tags: ['todos'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredPermissions: [Permission.TODO_DELETE] })],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(TodoIdResponseSchema, 'Delete a todo'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Todo not found'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const todos = await todoService.listTodos()
    return c.json({ success: true, data: todos })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const todo = await todoService.getTodo(parseInt(id))
    if (!todo) {
      return c.json({ success: false, error: 'Todo not found' }, 404)
    }
    return c.json({ success: true, data: todo })
  })
  .openapi(createRouteDef, async c => {
    const data = c.req.valid('json')
    const todo = await todoService.createTodo(data)
    return c.json({ success: true, data: todo }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const todo = await todoService.updateTodo(parseInt(id), data)
    if (!todo) {
      return c.json({ success: false, error: 'Todo not found' }, 404)
    }
    return c.json({ success: true, data: todo })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const numericId = parseInt(id)
    const result = await todoService.deleteTodo(numericId)
    if (!result) {
      return c.json({ success: false, error: 'Todo not found' }, 404)
    }
    return c.json({ success: true, data: { id: numericId } })
  })
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Todo API',
    },
  })
