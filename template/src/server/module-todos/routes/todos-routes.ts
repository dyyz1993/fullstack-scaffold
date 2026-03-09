import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as todoService from '../services/todo-service'
import { TodoSchema, CreateTodoSchema, UpdateTodoSchema } from '@shared/schemas'
import { successResponse, errorResponse } from '@server/utils/route-helpers'

const listRoute = createRoute({
  method: 'get',
  path: '/todos',
  tags: ['todos'],
  responses: {
    200: successResponse(z.array(TodoSchema), 'List all todos'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/todos/{id}',
  tags: ['todos'],
  request: {
    params: z.object({ id: z.string() }),
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
  request: {
    params: z.object({ id: z.string() }),
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
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(z.object({ id: z.number() }), 'Delete a todo'),
    404: errorResponse('Todo not found'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const todos = await todoService.listTodos()
    return c.json({ success: true, data: todos })
  })
  .openapi(getRoute, async c => {
    const id = parseInt(c.req.param('id'))
    const todo = await todoService.getTodo(id)
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
    const id = parseInt(c.req.param('id'))
    const data = c.req.valid('json')
    const todo = await todoService.updateTodo(id, data)
    if (!todo) {
      return c.json({ success: false, error: 'Todo not found' }, 404)
    }
    return c.json({ success: true, data: todo })
  })
  .openapi(deleteRoute, async c => {
    const id = parseInt(c.req.param('id'))
    const result = await todoService.deleteTodo(id)
    if (!result) {
      return c.json({ success: false, error: 'Todo not found' }, 404)
    }
    return c.json({ success: true, data: { id } })
  })
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Todo API',
    },
  })
