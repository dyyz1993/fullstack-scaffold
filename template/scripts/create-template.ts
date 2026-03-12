/**
 * 模块模板生成器
 *
 * 用法：
 *   npm run create:module <name> [options]
 *
 * 选项：
 *   --with-db       包含数据库操作
 *   --sse           SSE (Server-Sent Events) 模板
 *   --ws            WebSocket 模板
 *
 * 示例：
 *   npm run create:module product                    # 基础模板（无数据库）
 *   npm run create:module product --with-db          # 数据库模板
 *   npm run create:module notifications --sse        # SSE 模板
 *   npm run create:module chat --ws                  # WebSocket 模板
 *
 * 自动操作：
 *   1. 创建模块目录结构
 *   2. 创建 schema 文件 (shared/modules/{name}/schemas.ts)
 *   3. 更新 app.ts 导入和注册路由
 *   4. 更新 shared/modules/index.ts 导出
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const templateDir = path.resolve(__dirname, '..')

interface CreateOptions {
  name: string
  withDatabase: boolean
  withSSE: boolean
  withWebSocket: boolean
}

interface CreatedFile {
  path: string
  type: 'created' | 'modified'
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

// ============================================
// Schema 模板
// ============================================

function generateBasicSchema(name: string): string {
  const pascalName = toPascalCase(name)

  return `import { z } from 'zod'

export const ${pascalName}Schema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const Create${pascalName}Schema = ${pascalName}Schema.omit({ id: true, createdAt: true, updatedAt: true })

export const Update${pascalName}Schema = ${pascalName}Schema.partial().omit({ id: true, createdAt: true, updatedAt: true })

export const ${pascalName}ListSchema = z.array(${pascalName}Schema)

export type ${pascalName} = z.infer<typeof ${pascalName}Schema>
export type Create${pascalName}Input = z.infer<typeof Create${pascalName}Schema>
export type Update${pascalName}Input = z.infer<typeof Update${pascalName}Schema>
`
}

function generateSSESchema(name: string): string {
  const pascalName = toPascalCase(name)

  return `import { z } from 'zod'

export const ${pascalName}EventSchema = z.object({
  id: z.string(),
  type: z.enum(['created', 'updated', 'deleted']),
  data: z.unknown(),
  timestamp: z.string(),
})

export const ${pascalName}SubscriptionSchema = z.object({
  userId: z.string().optional(),
  filter: z.string().optional(),
})

export type ${pascalName}Event = z.infer<typeof ${pascalName}EventSchema>
export type ${pascalName}Subscription = z.infer<typeof ${pascalName}SubscriptionSchema>
`
}

function generateWebSocketSchema(name: string): string {
  const pascalName = toPascalCase(name)

  return `import { z } from 'zod'

export const ${pascalName}MessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  timestamp: z.string(),
  senderId: z.string().optional(),
})

export const ${pascalName}ConnectionSchema = z.object({
  userId: z.string().optional(),
  roomId: z.string().optional(),
})

export type ${pascalName}Message = z.infer<typeof ${pascalName}MessageSchema>
export type ${pascalName}Connection = z.infer<typeof ${pascalName}ConnectionSchema>
`
}

// ============================================
// 路由模板
// ============================================

function generateBasicRouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as ${camelName}Service from '../services/${kebabName}-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  ${pascalName}Schema,
  Create${pascalName}Schema,
  Update${pascalName}Schema,
  ${pascalName}ListSchema,
} from '@shared/modules/${kebabName}'
import { z } from 'zod'

const listRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s',
  tags: ['${kebabName}s'],
  responses: {
    200: successResponse(${pascalName}ListSchema, 'List all ${kebabName}s'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
  },
  responses: {
    200: successResponse(${pascalName}Schema, 'Get ${kebabName} by id'),
    404: errorResponse('${pascalName} not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRoute = createRoute({
  method: 'post',
  path: '/${kebabName}s',
  tags: ['${kebabName}s'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: Create${pascalName}Schema,
        },
      },
    },
  },
  responses: {
    201: successResponse(${pascalName}Schema, 'Create ${kebabName}'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: Update${pascalName}Schema,
        },
      },
    },
  },
  responses: {
    200: successResponse(${pascalName}Schema, 'Update ${kebabName}'),
    404: errorResponse('${pascalName} not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
  },
  responses: {
    200: successResponse(z.object({ message: z.string() }), '${pascalName} deleted'),
    404: errorResponse('${pascalName} not found'),
    500: errorResponse('Internal server error'),
  },
})

export const ${camelName}Routes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await ${camelName}Service.getAll()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ${camelName}Service.getById(id)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRoute, async c => {
    const body = c.req.valid('json')
    const result = await ${camelName}Service.create(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await ${camelName}Service.update(id, body)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ${camelName}Service.delete${pascalName}(id)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
`
}

function generateDatabaseRouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as ${camelName}Service from '../services/${kebabName}-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  ${pascalName}Schema,
  Create${pascalName}Schema,
  Update${pascalName}Schema,
  ${pascalName}ListSchema,
} from '@shared/modules/${kebabName}'
import { z } from 'zod'

const listRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s',
  tags: ['${kebabName}s'],
  responses: {
    200: successResponse(${pascalName}ListSchema, 'List all ${kebabName}s'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
  },
  responses: {
    200: successResponse(${pascalName}Schema, 'Get ${kebabName} by id'),
    404: errorResponse('${pascalName} not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRoute = createRoute({
  method: 'post',
  path: '/${kebabName}s',
  tags: ['${kebabName}s'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: Create${pascalName}Schema,
        },
      },
    },
  },
  responses: {
    201: successResponse(${pascalName}Schema, 'Create ${kebabName}'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: Update${pascalName}Schema,
        },
      },
    },
  },
  responses: {
    200: successResponse(${pascalName}Schema, 'Update ${kebabName}'),
    404: errorResponse('${pascalName} not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
  },
  responses: {
    200: successResponse(z.object({ message: z.string() }), '${pascalName} deleted'),
    404: errorResponse('${pascalName} not found'),
    500: errorResponse('Internal server error'),
  },
})

export const ${camelName}Routes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await ${camelName}Service.getAll()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ${camelName}Service.getById(id)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRoute, async c => {
    const body = c.req.valid('json')
    const result = await ${camelName}Service.create(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await ${camelName}Service.update(id, body)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ${camelName}Service.delete${pascalName}(id)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
`
}

function generateSSERouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as ${camelName}Service from '../services/${kebabName}-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import { ${pascalName}SubscriptionSchema } from '@shared/modules/${kebabName}'

const streamRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/stream',
  tags: ['${kebabName}s'],
  request: {
    query: ${pascalName}SubscriptionSchema,
  },
  responses: {
    200: {
      description: 'SSE stream for ${kebabName} events',
      content: {
        'text/event-stream': {
          schema: { type: 'string' },
        },
      },
    },
    500: errorResponse('Internal server error'),
  },
})

export const ${camelName}Routes = new OpenAPIHono()
  .openapi(streamRoute, async c => {
    const query = c.req.valid('query')

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          const unsubscribe = await ${camelName}Service.subscribe(query, (event) => {
            const data = \`event: message\\ndata: \${JSON.stringify(event)}\\n\\n\`
            controller.enqueue(encoder.encode(data))
          })

          const heartbeat = setInterval(() => {
            controller.enqueue(encoder.encode(': heartbeat\\n\\n'))
          }, 30000)

          const cleanup = () => {
            clearInterval(heartbeat)
            unsubscribe()
          }

          c.req.raw.signal.addEventListener('abort', cleanup)
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    )
  })
`
}

function generateWebSocketRouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { upgradeWebSocket } from 'hono/cloudflare-workers'
import * as ${camelName}Service from '../services/${kebabName}-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import { ${pascalName}ConnectionSchema } from '@shared/modules/${kebabName}'

const wsRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/ws',
  tags: ['${kebabName}s'],
  request: {
    query: ${pascalName}ConnectionSchema,
  },
  responses: {
    101: {
      description: 'WebSocket connection for ${kebabName}',
    },
    500: errorResponse('Internal server error'),
  },
})

export const ${camelName}Routes = new OpenAPIHono()
  .openapi(wsRoute, async c => {
    const query = c.req.valid('query')

    return upgradeWebSocket({
      onOpen(event, ws) {
        ${camelName}Service.onConnect(ws, query)
      },
      onMessage(event, ws) {
        ${camelName}Service.onMessage(ws, event.data.toString())
      },
      onClose(event, ws) {
        ${camelName}Service.onDisconnect(ws)
      },
    })(c, async () => {})
  })
`
}

// ============================================
// 服务模板
// ============================================

function generateBasicServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

  return `/**
 * ${pascalName} 服务层 (基础模板 - 无数据库)
 *
 * 职责：
 * - 业务逻辑处理
 * - 数据验证
 * - 内存存储
 */

const ${camelName}Store = new Map<string, any>()
let idCounter = 0

export const getAll = async () => {
  return Array.from(${camelName}Store.values())
}

export const getById = async (id: string) => {
  return ${camelName}Store.get(id) || null
}

export const create = async (data: any) => {
  const id = \`\${++idCounter}\`
  const item = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  ${camelName}Store.set(id, item)
  return item
}

export const update = async (id: string, data: any) => {
  const existing = ${camelName}Store.get(id)
  if (!existing) return null

  const updated = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }
  ${camelName}Store.set(id, updated)
  return updated
}

export const delete${pascalName} = async (id: string) => {
  return ${camelName}Store.delete(id)
}
`
}

function generateDatabaseServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `/**
 * ${pascalName} 服务层 (数据库模板)
 *
 * 职责：
 * - 业务逻辑处理
 * - 数据验证
 * - 数据库操作
 */

import { db } from '@server/db'
import { ${kebabName}s } from '@server/db/schema'
import { eq } from 'drizzle-orm'

export const getAll = async () => {
  return await db.select().from(${kebabName}s)
}

export const getById = async (id: string) => {
  const result = await db.select().from(${kebabName}s).where(eq(${kebabName}s.id, id))
  return result[0] || null
}

export const create = async (data: any) => {
  const result = await db.insert(${kebabName}s).values(data).returning()
  return result[0]
}

export const update = async (id: string, data: any) => {
  const result = await db
    .update(${kebabName}s)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(${kebabName}s.id, id))
    .returning()
  return result[0] || null
}

export const delete${pascalName} = async (id: string) => {
  const result = await db.delete(${kebabName}s).where(eq(${kebabName}s.id, id)).returning()
  return result.length > 0
}
`
}

function generateSSEServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

  return `/**
 * ${pascalName} 服务层 (SSE 模板)
 *
 * 职责：
 * - SSE 订阅管理
 * - 事件广播
 * - 连接管理
 */

import type { ${pascalName}Event, ${pascalName}Subscription } from '@shared/modules/${name}'

type EventCallback = (event: ${pascalName}Event) => void

const subscribers = new Map<string, EventCallback>()

export const subscribe = async (
  subscription: ${pascalName}Subscription,
  callback: EventCallback
): Promise<() => void> => {
  const subscriberId = crypto.randomUUID()
  subscribers.set(subscriberId, callback)

  return () => {
    subscribers.delete(subscriberId)
  }
}

export const broadcast = async (event: ${pascalName}Event) => {
  for (const callback of subscribers.values()) {
    callback(event)
  }
}

export const getSubscriberCount = () => {
  return subscribers.size
}
`
}

function generateWebSocketServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

  return `/**
 * ${pascalName} 服务层 (WebSocket 模板)
 *
 * 职责：
 * - WebSocket 连接管理
 * - 消息广播
 * - 房间管理
 */

import type { ${pascalName}Message, ${pascalName}Connection } from '@shared/modules/${name}'

const connections = new Set<WebSocket>()
const rooms = new Map<string, Set<WebSocket>>()

export const onConnect = async (ws: WebSocket, connection: ${pascalName}Connection) => {
  connections.add(ws)

  if (connection.roomId) {
    if (!rooms.has(connection.roomId)) {
      rooms.set(connection.roomId, new Set())
    }
    rooms.get(connection.roomId)!.add(ws)
  }
}

export const onMessage = async (ws: WebSocket, data: string) => {
  try {
    const message: ${pascalName}Message = JSON.parse(data)

    // Echo back or broadcast to room
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }))
    }
  } catch (error) {
    console.error('Failed to parse message:', error)
  }
}

export const onDisconnect = async (ws: WebSocket) => {
  connections.delete(ws)

  // Remove from all rooms
  for (const room of rooms.values()) {
    room.delete(ws)
  }
}

export const broadcast = async (message: ${pascalName}Message, roomId?: string) => {
  const targets = roomId ? rooms.get(roomId) : connections
  const data = JSON.stringify(message)

  for (const ws of targets || []) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

export const getConnectionCount = () => connections.size
`
}

// ============================================
// 测试模板
// ============================================

function generateBasicServiceTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect, beforeEach } from 'vitest'
import * as service from '../services/${kebabName}-service'

describe('${pascalName} Service', () => {
  beforeEach(() => {
    // Reset store before each test
  })

  describe('getAll', () => {
    it('should return an array', async () => {
      const result = await service.getAll()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new item', async () => {
      const data = { name: 'Test Item' }
      const result = await service.create(data)
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Test Item')
    })
  })

  describe('update', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.update('non-existent', {})
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should return false for non-existent id', async () => {
      const result = await service.delete${pascalName}('non-existent')
      expect(result).toBe(false)
    })
  })
})
`
}

function generateSSEServiceTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect, vi } from 'vitest'
import * as service from '../services/${kebabName}-service'
import type { ${pascalName}Event } from '@shared/modules/${name}'

describe('${pascalName} Service (SSE)', () => {
  describe('subscribe', () => {
    it('should return unsubscribe function', async () => {
      const callback = vi.fn()
      const unsubscribe = await service.subscribe({}, callback)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('broadcast', () => {
    it('should call all subscriber callbacks', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      await service.subscribe({}, callback1)
      await service.subscribe({}, callback2)

      const event: ${pascalName}Event = {
        id: '1',
        type: 'created',
        data: { name: 'Test' },
        timestamp: new Date().toISOString(),
      }

      await service.broadcast(event)

      expect(callback1).toHaveBeenCalledWith(event)
      expect(callback2).toHaveBeenCalledWith(event)
    })
  })

  describe('getSubscriberCount', () => {
    it('should return current subscriber count', async () => {
      const initialCount = service.getSubscriberCount()
      expect(typeof initialCount).toBe('number')
    })
  })
})
`
}

function generateWebSocketServiceTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect, vi } from 'vitest'
import * as service from '../services/${kebabName}-service'

describe('${pascalName} Service (WebSocket)', () => {
  describe('onConnect', () => {
    it('should add connection to set', async () => {
      const mockWs = { readyState: 1 } as WebSocket
      await service.onConnect(mockWs, {})

      const count = service.getConnectionCount()
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getConnectionCount', () => {
    it('should return current connection count', async () => {
      const count = service.getConnectionCount()
      expect(typeof count).toBe('number')
    })
  })
})
`
}

function generateBasicRouteTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('${pascalName} Routes', () => {
  describe('GET /api/${kebabName}s', () => {
    it('should return list of ${kebabName}s', async () => {
      const client = createTestClient()
      const res = await client.api.${kebabName}s.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('GET /api/${kebabName}s/:id', () => {
    it('should return 404 for non-existent ${kebabName}', async () => {
      const client = createTestClient()
      const res = await client.api.${kebabName}s[':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
    })
  })
})
`
}

function generateSSERouteTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('${pascalName} Routes (SSE)', () => {
  describe('GET /api/${kebabName}s/stream', () => {
    it('should return SSE stream', async () => {
      const client = createTestClient()
      const res = await client.api.${kebabName}s.stream.$get()

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('text/event-stream')
    })
  })
})
`
}

function generateWebSocketRouteTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('${pascalName} Routes (WebSocket)', () => {
  describe('GET /api/${kebabName}s/ws', () => {
    it('should upgrade to WebSocket', async () => {
      const client = createTestClient()
      const res = await client.api.${kebabName}s.ws.$get()

      // WebSocket upgrade returns 101
      expect([101, 426]).toContain(res.status)
    })
  })
})
`
}

function generateModuleIndexTemplate(): string {
  return `export * from './schemas'
`
}

// ============================================
// 更新 app.ts 和 shared/modules/index.ts
// ============================================

function updateAppTs(name: string): boolean {
  const appPath = path.join(templateDir, 'src/server/app.ts')
  if (!fs.existsSync(appPath)) {
    console.log(`⚠️  app.ts 不存在: ${appPath}`)
    return false
  }

  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  let content = fs.readFileSync(appPath, 'utf-8')

  if (content.includes(`${camelName}Routes`)) {
    console.log(`⚠️  app.ts 已经包含 ${camelName}Routes`)
    return false
  }

  // 添加导入语句
  const importRegex = /(import \{[^}]+\} from '\.\/module-[^']+'\n)/
  const lastImportMatch = content.match(importRegex)

  if (lastImportMatch) {
    const lastImportIndex = content.lastIndexOf(lastImportMatch[0]) + lastImportMatch[0].length
    content =
      content.slice(0, lastImportIndex) +
      `import { ${camelName}Routes } from './module-${kebabName}/routes/${kebabName}-routes'\n` +
      content.slice(lastImportIndex)
  } else {
    const firstImportEnd = content.indexOf('\n', content.indexOf('import'))
    content =
      content.slice(0, firstImportEnd + 1) +
      `import { ${camelName}Routes } from './module-${kebabName}/routes/${kebabName}-routes'\n` +
      content.slice(firstImportEnd + 1)
  }

  // 添加路由注册
  const routeRegex = /(\.route\('\/api', [a-zA-Z]+Routes\)\n)/
  const lastRouteMatch = content.match(routeRegex)

  if (lastRouteMatch) {
    const lastRouteIndex = content.lastIndexOf(lastRouteMatch[0]) + lastRouteMatch[0].length
    content =
      content.slice(0, lastRouteIndex) +
      `    .route('/api', ${camelName}Routes)\n` +
      content.slice(lastRouteIndex)
  }

  // 添加导出
  const exportRegex = /export \{[^}]+\}/
  const exportMatch = content.match(exportRegex)

  if (exportMatch) {
    const exportStatement = exportMatch[0]
    const newExport = exportStatement.replace('}', `, ${camelName}Routes }`)
    content = content.replace(exportRegex, newExport)
  }

  fs.writeFileSync(appPath, content)
  return true
}

function updateSharedModulesIndex(name: string, options: CreateOptions): boolean {
  const indexPath = path.join(templateDir, 'src/shared/modules/index.ts')
  if (!fs.existsSync(indexPath)) {
    console.log(`⚠️  shared/modules/index.ts 不存在: ${indexPath}`)
    return false
  }

  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  let content = fs.readFileSync(indexPath, 'utf-8')

  if (content.includes(`from './${kebabName}'`)) {
    console.log(`⚠️  shared/modules/index.ts 已经包含 ${kebabName} 模块`)
    return false
  }

  let exports: string

  if (options.withSSE) {
    exports = `
export {
  ${pascalName}EventSchema,
  ${pascalName}SubscriptionSchema,
  type ${pascalName}Event,
  type ${pascalName}Subscription,
} from './${kebabName}'`
  } else if (options.withWebSocket) {
    exports = `
export {
  ${pascalName}MessageSchema,
  ${pascalName}ConnectionSchema,
  type ${pascalName}Message,
  type ${pascalName}Connection,
} from './${kebabName}'`
  } else {
    exports = `
export {
  ${pascalName}Schema,
  Create${pascalName}Schema,
  Update${pascalName}Schema,
  ${pascalName}ListSchema,
  type ${pascalName},
  type Create${pascalName}Input,
  type Update${pascalName}Input,
} from './${kebabName}'`
  }

  content = content.trimEnd() + exports + '\n'

  fs.writeFileSync(indexPath, content)
  return true
}

// ============================================
// 主创建函数
// ============================================

function createModule(options: CreateOptions): CreatedFile[] {
  const { name, withDatabase, withSSE, withWebSocket } = options
  const kebabName = toKebabCase(name)
  const moduleName = `module-${kebabName}`
  const moduleDir = path.join(templateDir, 'src/server', moduleName)
  const sharedModuleDir = path.join(templateDir, 'src/shared/modules', kebabName)

  const createdFiles: CreatedFile[] = []

  if (fs.existsSync(moduleDir)) {
    console.log(`⚠️  模块已存在: ${moduleDir}`)
    return []
  }

  // 创建目录结构
  const routesDir = path.join(moduleDir, 'routes')
  const servicesDir = path.join(moduleDir, 'services')
  const testsDir = path.join(moduleDir, '__tests__')

  fs.mkdirSync(routesDir, { recursive: true })
  fs.mkdirSync(servicesDir, { recursive: true })
  fs.mkdirSync(testsDir, { recursive: true })
  fs.mkdirSync(sharedModuleDir, { recursive: true })

  // 选择模板
  let schemaTemplate: string
  let routeTemplate: string
  let serviceTemplate: string
  let serviceTestTemplate: string
  let routeTestTemplate: string

  if (withSSE) {
    schemaTemplate = generateSSESchema(name)
    routeTemplate = generateSSERouteTemplate(name)
    serviceTemplate = generateSSEServiceTemplate(name)
    serviceTestTemplate = generateSSEServiceTestTemplate(name)
    routeTestTemplate = generateSSERouteTestTemplate(name)
  } else if (withWebSocket) {
    schemaTemplate = generateWebSocketSchema(name)
    routeTemplate = generateWebSocketRouteTemplate(name)
    serviceTemplate = generateWebSocketServiceTemplate(name)
    serviceTestTemplate = generateWebSocketServiceTestTemplate(name)
    routeTestTemplate = generateWebSocketRouteTestTemplate(name)
  } else if (withDatabase) {
    schemaTemplate = generateBasicSchema(name)
    routeTemplate = generateDatabaseRouteTemplate(name)
    serviceTemplate = generateDatabaseServiceTemplate(name)
    serviceTestTemplate = generateBasicServiceTestTemplate(name)
    routeTestTemplate = generateBasicRouteTestTemplate(name)
  } else {
    schemaTemplate = generateBasicSchema(name)
    routeTemplate = generateBasicRouteTemplate(name)
    serviceTemplate = generateBasicServiceTemplate(name)
    serviceTestTemplate = generateBasicServiceTestTemplate(name)
    routeTestTemplate = generateBasicRouteTestTemplate(name)
  }

  // 创建文件
  const schemaFile = path.join(sharedModuleDir, 'schemas.ts')
  fs.writeFileSync(schemaFile, schemaTemplate)
  createdFiles.push({ path: schemaFile, type: 'created' })

  const sharedIndexFile = path.join(sharedModuleDir, 'index.ts')
  fs.writeFileSync(sharedIndexFile, generateModuleIndexTemplate())
  createdFiles.push({ path: sharedIndexFile, type: 'created' })

  const routeFile = path.join(routesDir, `${kebabName}-routes.ts`)
  fs.writeFileSync(routeFile, routeTemplate)
  createdFiles.push({ path: routeFile, type: 'created' })

  const serviceFile = path.join(servicesDir, `${kebabName}-service.ts`)
  fs.writeFileSync(serviceFile, serviceTemplate)
  createdFiles.push({ path: serviceFile, type: 'created' })

  const serviceTestFile = path.join(testsDir, `${kebabName}-service.test.ts`)
  fs.writeFileSync(serviceTestFile, serviceTestTemplate)
  createdFiles.push({ path: serviceTestFile, type: 'created' })

  const routeTestFile = path.join(testsDir, `${kebabName}-route.test.ts`)
  fs.writeFileSync(routeTestFile, routeTestTemplate)
  createdFiles.push({ path: routeTestFile, type: 'created' })

  // 更新 app.ts
  if (updateAppTs(name)) {
    createdFiles.push({ path: path.join(templateDir, 'src/server/app.ts'), type: 'modified' })
  }

  // 更新 shared/modules/index.ts
  if (updateSharedModulesIndex(name, options)) {
    createdFiles.push({
      path: path.join(templateDir, 'src/shared/modules/index.ts'),
      type: 'modified',
    })
  }

  return createdFiles
}

function parseArgs(args: string[]): CreateOptions {
  const options: CreateOptions = {
    name: '',
    withDatabase: false,
    withSSE: false,
    withWebSocket: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--with-db') {
      options.withDatabase = true
    } else if (arg === '--sse') {
      options.withSSE = true
    } else if (arg === '--ws') {
      options.withWebSocket = true
    } else if (!arg.startsWith('--')) {
      options.name = arg
    }
  }

  return options
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log(`
用法：
  npm run create:module <name> [options]

选项：
  --with-db       包含数据库操作
  --sse           SSE (Server-Sent Events) 模板
  --ws            WebSocket 模板

示例：
  npm run create:module product                    # 基础模板（无数据库）
  npm run create:module product --with-db          # 数据库模板
  npm run create:module notifications --sse        # SSE 模板
  npm run create:module chat --ws                  # WebSocket 模板

自动操作：
  1. 创建模块目录结构 (src/server/module-{name}/)
  2. 创建 schema 文件 (src/shared/modules/{name}/schemas.ts)
  3. 更新 app.ts 导入和注册路由
  4. 更新 shared/modules/index.ts 导出
`)
    process.exit(1)
  }

  const options = parseArgs(args)

  if (!options.name) {
    console.log(`❌ 请提供模块名称`)
    process.exit(1)
  }

  // 检查互斥选项
  const selectedOptions = [options.withDatabase, options.withSSE, options.withWebSocket].filter(
    Boolean
  ).length
  if (selectedOptions > 1) {
    console.log(`❌ 只能选择一个模板类型: --with-db, --sse, 或 --ws`)
    process.exit(1)
  }

  const createdFiles = createModule(options)

  if (createdFiles.length > 0) {
    const created = createdFiles.filter(f => f.type === 'created')
    const modified = createdFiles.filter(f => f.type === 'modified')

    let templateType = '基础模板（无数据库）'
    if (options.withDatabase) templateType = '数据库模板'
    if (options.withSSE) templateType = 'SSE 模板'
    if (options.withWebSocket) templateType = 'WebSocket 模板'

    console.log(`\n✅ 模块创建成功！(${templateType})\n`)

    if (created.length > 0) {
      console.log('📄 创建的文件：')
      created.forEach(file => {
        const relativePath = path.relative(templateDir, file.path)
        console.log(`   ${relativePath}`)
      })
      console.log()
    }

    if (modified.length > 0) {
      console.log('✏️  修改的文件：')
      modified.forEach(file => {
        const relativePath = path.relative(templateDir, file.path)
        console.log(`   ${relativePath}`)
      })
      console.log()
    }

    console.log('🚀 下一步：')
    if (options.withDatabase) {
      console.log('   1. 在 src/server/db/schema/ 创建数据库表定义')
      console.log('   2. 实现服务层数据库操作')
    } else if (options.withSSE) {
      console.log('   1. 实现 SSE 事件触发逻辑')
      console.log('   2. 添加事件过滤逻辑')
    } else if (options.withWebSocket) {
      console.log('   1. 实现 WebSocket 消息处理')
      console.log('   2. 添加房间管理逻辑')
    } else {
      console.log('   1. 实现服务层业务逻辑')
      console.log('   2. 添加数据存储')
    }
    console.log('   3. 运行测试: npm test')
    console.log()
  }
}

main()
