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

interface ModifiedFileResult {
  success: boolean
  diff?: string
  addedLines?: number
}

interface CreatedFile {
  path: string
  type: 'created' | 'modified'
  diff?: string
  lineCount?: number
}

function generateClientUsageExample(name: string, options: CreateOptions): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  if (options.withSSE) {
    return `
// 📡 SSE 客户端使用示例

// 1️⃣ React Hook 方式（推荐）
import { useSSE } from '@client/hooks/useSSE'
import { apiClient } from '@client/services/apiClient'
import type { ${pascalName}Event, ${pascalName}Subscription } from '@shared/modules/${kebabName}'

function ${pascalName}Component() {
  const { status, connect, disconnect, client } = useSSE<${pascalName}Subscription>(
    () => apiClient.api['${kebabName}s'].stream.$sse({ query: {} })
  )

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  useEffect(() => {
    if (!client) return

    // 🎯 类型安全的事件监听 - 根据 type 自动推导 payload 类型
    const unsubscribe = client.on('message', (event: ${pascalName}Event) => {
      // TypeScript 能够根据 event.type 自动推导 payload 类型
      switch (event.type) {
        case 'created':
          // event.payload 类型自动推导为 CreatedPayload
          console.log('创建:', event.payload)
          break
        case 'updated':
          // event.payload 类型自动推导为 UpdatedPayload
          console.log('更新:', event.payload)
          break
        case 'deleted':
          // event.payload 类型自动推导为 DeletedPayload
          console.log('删除:', event.payload)
          break
      }
    })

    return unsubscribe
  }, [client])

  return <div>SSE 状态: {status}</div>
}

// 2️⃣ 直接使用 apiClient
import { apiClient } from '@client/services/apiClient'

const sseClient = await apiClient.api['${kebabName}s'].stream.$sse({ query: {} })

// 监听连接状态
sseClient.onStatusChange(status => {
  console.log('SSE 状态:', status)
})

// 监听事件（带类型推导）
sseClient.on('message', (event: ${pascalName}Event) => {
  if (event.type === 'created') {
    // TypeScript 知道 event.payload 是 CreatedPayload 类型
    console.log('新创建:', event.payload)
  }
})

// 关闭连接
sseClient.abort()
`
  } else if (options.withWebSocket) {
    return `
// 🔌 WebSocket 客户端使用示例

// 1️⃣ React Hook 方式（推荐）
import { useWebSocket } from '@client/hooks/useWebSocket'
import { apiClient } from '@client/services/apiClient'
import type { ${pascalName}Message } from '@shared/modules/${kebabName}'

function ${pascalName}Component() {
  const { status, connect, disconnect, call, emit, on } = useWebSocket(
    apiClient.api['${kebabName}s'].ws
  )

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  useEffect(() => {
    // 🎯 类型安全的事件监听 - 根据 type 自动推导 payload 类型
    const unsubscribe = on('message', (message: ${pascalName}Message) => {
      // TypeScript 能够根据 message.type 自动推导 payload 类型
      switch (message.type) {
        case 'chat':
          // message.payload 类型自动推导为 ChatPayload
          console.log('聊天消息:', message.payload)
          break
        case 'notification':
          // message.payload 类型自动推导为 NotificationPayload
          console.log('通知:', message.payload)
          break
        case 'system':
          // message.payload 类型自动推导为 SystemPayload
          console.log('系统消息:', message.payload)
          break
      }
    })

    return unsubscribe
  }, [on])

  // 🎯 类型安全的 RPC 调用
  const handleEcho = async () => {
    // 参数和返回值都有类型检查
    const result = await call('echo', { message: 'Hello' })
    console.log('Echo 结果:', result)
  }

  // 🎯 类型安全的事件发送
  const handleSend = () => {
    emit('message', { id: '1', type: 'chat', payload: { text: 'Hello' } })
  }

  return (
    <div>
      <p>WebSocket 状态: {status}</p>
      <button onClick={handleEcho}>Echo</button>
      <button onClick={handleSend}>发送消息</button>
    </div>
  )
}

// 2️⃣ 直接使用 apiClient
import { apiClient } from '@client/services/apiClient'

const wsClient = apiClient.api['${kebabName}s'].ws.$ws()

// 监听连接状态
wsClient.onStatusChange(status => {
  console.log('WebSocket 状态:', status)
})

// 发送消息（带类型检查）
wsClient.emit('message', { id: '1', type: 'chat', payload: { text: 'Hello' } })

// 监听消息（带类型推导）
wsClient.on('message', (message: ${pascalName}Message) => {
  if (message.type === 'chat') {
    // TypeScript 知道 message.payload 是 ChatPayload 类型
    console.log('聊天:', message.payload)
  }
})

// RPC 调用（带类型检查）
const result = await wsClient.call('echo', { message: 'Hello' })

// 关闭连接
wsClient.close()
`
  } else {
    return `
// 📦 REST API 客户端使用示例

// 1️⃣ React Hook 方式（推荐使用 SWR 或 React Query）
import useSWR from 'swr'
import { apiClient } from '@client/services/apiClient'
import type { ${pascalName}, Create${pascalName}Input, Update${pascalName}Input } from '@shared/modules/${kebabName}'

function ${pascalName}Component() {
  // 🎯 类型安全的列表查询
  const { data: listData, mutate } = useSWR(
    '${kebabName}s-list',
    async () => {
      const res = await apiClient.api['${kebabName}s'].$get()
      const data = await res.json()
      return data.success ? data.data : []
    }
  )

  // 🎯 类型安全的创建操作
  const handleCreate = async (input: Create${pascalName}Input) => {
    const res = await apiClient.api['${kebabName}s'].$post({ json: input })
    const data = await res.json()
    if (data.success) {
      mutate() // 刷新列表
    }
  }

  // 🎯 类型安全的更新操作
  const handleUpdate = async (id: string, input: Update${pascalName}Input) => {
    const res = await apiClient.api['${kebabName}s'][':id'].$put({
      param: { id },
      json: input,
    })
    const data = await res.json()
    if (data.success) {
      mutate()
    }
  }

  // 🎯 类型安全的删除操作
  const handleDelete = async (id: string) => {
    const res = await apiClient.api['${kebabName}s'][':id'].$delete({
      param: { id },
    })
    const data = await res.json()
    if (data.success) {
      mutate()
    }
  }

  return (
    <div>
      {listData?.map(item => (
        <div key={item.id}>
          {item.name}
          <button onClick={() => handleUpdate(item.id, { name: 'Updated' })}>更新</button>
          <button onClick={() => handleDelete(item.id)}>删除</button>
        </div>
      ))}
    </div>
  )
}

// 2️⃣ 直接使用 apiClient
import { apiClient } from '@client/services/apiClient'
import type { ${pascalName}, Create${pascalName}Input } from '@shared/modules/${kebabName}'

// 获取列表
const listRes = await apiClient.api['${kebabName}s'].$get()
const listData = await listRes.json()
if (listData.success) {
  console.log('列表:', listData.data) // data 类型为 ${pascalName}[]
}

// 获取单个
const getRes = await apiClient.api['${kebabName}s'][':id'].$get({
  param: { id: '1' },
})
const getData = await getRes.json()
if (getData.success) {
  console.log('详情:', getData.data) // data 类型为 ${pascalName}
}

// 创建
const createRes = await apiClient.api['${kebabName}s'].$post({
  json: { name: 'New ${pascalName}' } as Create${pascalName}Input,
})
const createData = await createRes.json()
if (createData.success) {
  console.log('创建成功:', createData.data)
}

// 更新
const updateRes = await apiClient.api['${kebabName}s'][':id'].$put({
  param: { id: '1' },
  json: { name: 'Updated ${pascalName}' },
})
const updateData = await updateRes.json()
if (updateData.success) {
  console.log('更新成功:', updateData.data)
}

// 删除
const deleteRes = await apiClient.api['${kebabName}s'][':id'].$delete({
  param: { id: '1' },
})
const deleteData = await deleteRes.json()
if (deleteData.success) {
  console.log('删除成功')
}
`
  }
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

export const DeleteResultSchema = z.object({ message: z.string() })

export type ${pascalName} = z.infer<typeof ${pascalName}Schema>
export type Create${pascalName}Input = z.infer<typeof Create${pascalName}Schema>
export type Update${pascalName}Input = z.infer<typeof Update${pascalName}Schema>
export type DeleteResult = z.infer<typeof DeleteResultSchema>
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

export const WebSocketStatusSchema = z.object({
  connectedClients: z.number(),
})

export type ${pascalName}Message = z.infer<typeof ${pascalName}MessageSchema>
export type ${pascalName}Connection = z.infer<typeof ${pascalName}ConnectionSchema>
export type WebSocketStatus = z.infer<typeof WebSocketStatusSchema>
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
  DeleteResultSchema,
} from '@shared/modules/${kebabName}'

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

const createRouteDef = createRoute({
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
    200: successResponse(DeleteResultSchema, '${pascalName} deleted'),
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
  .openapi(createRouteDef, async c => {
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
  DeleteResultSchema,
} from '@shared/modules/${kebabName}'

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

const createRouteDef = createRoute({
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
    200: successResponse(DeleteResultSchema, '${pascalName} deleted'),
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
  .openapi(createRouteDef, async c => {
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
import { errorResponse } from '../../utils/route-helpers'
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
import type { AppBindings } from '../../types/bindings'
import { getRuntimeAdapter } from '@server/core/runtime'
import { ${pascalName}MessageSchema, WebSocketStatusSchema } from '@shared/modules/${kebabName}'
import { successResponse } from '@server/utils/route-helpers'

const statusRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/ws/status',
  tags: ['${kebabName}s'],
  responses: {
    200: successResponse(WebSocketStatusSchema, 'Get WebSocket status'),
  },
})

const wsRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/ws',
  tags: ['${kebabName}s'],
  responses: {
    200: {
      content: {
        websocket: {
          schema: ${pascalName}MessageSchema,
        },
      },
      description: 'WebSocket endpoint for ${kebabName}',
    },
  },
})

export const ${camelName}Routes = new OpenAPIHono<{ Bindings: AppBindings }>()
  .openapi(statusRoute, async c => {
    return c.json({ success: true, data: { connectedClients: 0 } })
  })
  .openapi(wsRoute, async _c => {
    const adapter = getRuntimeAdapter()
    if (
      'handleWebSocketRequest' in adapter &&
      typeof adapter.handleWebSocketRequest === 'function'
    ) {
      return (
        adapter as { handleWebSocketRequest: () => Response | Promise<Response> }
      ).handleWebSocketRequest()
    }
    return new Response('WebSocket not supported', { status: 500 })
  })

export type ${pascalName}RoutesType = typeof ${camelName}Routes
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

import type { ${pascalName}, Create${pascalName}Input, Update${pascalName}Input } from '@shared/modules/${name}'

type ${pascalName}Row = ${pascalName}

const ${camelName}Store = new Map<string, ${pascalName}Row>()
let idCounter = 0

export const getAll = async (): Promise<${pascalName}Row[]> => {
  return Array.from(${camelName}Store.values())
}

export const getById = async (id: string): Promise<${pascalName}Row | null> => {
  return ${camelName}Store.get(id) || null
}

export const create = async (data: Create${pascalName}Input): Promise<${pascalName}Row> => {
  const id = \`\${++idCounter}\`
  const item: ${pascalName}Row = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  ${camelName}Store.set(id, item)
  return item
}

export const update = async (id: string, data: Update${pascalName}Input): Promise<${pascalName}Row | null> => {
  const existing = ${camelName}Store.get(id)
  if (!existing) return null

  const updated: ${pascalName}Row = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }
  ${camelName}Store.set(id, updated)
  return updated
}

export const delete${pascalName} = async (id: string): Promise<boolean> => {
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
 *
 * TODO: 需要先创建数据库表定义
 * 1. 在 src/server/db/schema/index.ts 中添加表定义
 * 2. 取消注释下面的导入
 */

// TODO: 取消注释以下导入
// import { db } from '@server/db'
// import { eq } from 'drizzle-orm'
// import { ${kebabName}s } from '@server/db/schema'

import type { ${pascalName}, Create${pascalName}Input, Update${pascalName}Input } from '@shared/modules/${name}'

type ${pascalName}Row = ${pascalName}

export const getAll = async (): Promise<${pascalName}Row[]> => {
  // TODO: 实现数据库查询
  // return await db.select().from(${kebabName}s)
  return []
}

export const getById = async (_id: string): Promise<${pascalName}Row | null> => {
  // TODO: 实现数据库查询
  // const result = await db.select().from(${kebabName}s).where(eq(${kebabName}s.id, id))
  // return result[0] || null
  return null
}

export const create = async (data: Create${pascalName}Input): Promise<${pascalName}Row> => {
  // TODO: 实现数据库插入
  // const result = await db.insert(${kebabName}s).values(data).returning()
  // return result[0]
  return {
    id: 'temp',
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const update = async (_id: string, _data: Update${pascalName}Input): Promise<${pascalName}Row | null> => {
  // TODO: 实现数据库更新
  // const result = await db
  //   .update(${kebabName}s)
  //   .set({ ...data, updatedAt: new Date() })
  //   .where(eq(${kebabName}s.id, id))
  //   .returning()
  // return result[0] || null
  return null
}

export const delete${pascalName} = async (_id: string): Promise<boolean> => {
  // TODO: 实现数据库删除
  // const result = await db.delete(${kebabName}s).where(eq(${kebabName}s.id, id)).returning()
  // return result.length > 0
  return false
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
  _subscription: ${pascalName}Subscription,
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

  return `/**
 * ${pascalName} 服务层 (WebSocket 模板)
 *
 * 职责：
 * - WebSocket 连接管理
 * - 消息广播
 * - 房间管理
 *
 * 注意：此模板使用运行时适配器处理 WebSocket
 * 实际连接管理在 runtime 层实现
 */

import type { ${pascalName}Message } from '@shared/modules/${name}'

export const getConnectedClientsCount = (): number => {
  // TODO: 实现连接计数
  return 0
}

export const broadcast = async (_message: ${pascalName}Message): Promise<void> => {
  // TODO: 实现消息广播
}

export const broadcastToRoom = async (_roomId: string, _message: ${pascalName}Message): Promise<void> => {
  // TODO: 实现房间消息广播
}
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

  return `import { describe, it, expect } from 'vitest'
import * as service from '../services/${kebabName}-service'

describe('${pascalName} Service (WebSocket)', () => {
  describe('getConnectedClientsCount', () => {
    it('should return a number', async () => {
      const count = service.getConnectedClientsCount()
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
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
      const res = await client.api['${kebabName}s'].$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })
  })

  describe('GET /api/${kebabName}s/:id', () => {
    it('should return 404 for non-existent ${kebabName}', async () => {
      const client = createTestClient()
      const res = await client.api['${kebabName}s'][':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
      expect(typeof res.status).toBe('number')
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
      const res = await client.api['${kebabName}s'].stream.$get({
        query: {},
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('text/event-stream')
      expect(typeof res.status).toBe('number')
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
  describe('GET /api/${kebabName}s/ws/status', () => {
    it('should return WebSocket status', async () => {
      const client = createTestClient()
      const res = await client.api['${kebabName}s'].ws.status.$get()

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(typeof data.data.connectedClients).toBe('number')
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

function updateAppTs(name: string): ModifiedFileResult {
  const appPath = path.join(templateDir, 'src/server/app.ts')
  if (!fs.existsSync(appPath)) {
    console.log(`⚠️  app.ts 不存在: ${appPath}`)
    return { success: false }
  }

  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  let content = fs.readFileSync(appPath, 'utf-8')

  if (content.includes(`${camelName}Routes`)) {
    console.log(`⚠️  app.ts 已经包含 ${camelName}Routes`)
    return { success: false }
  }

  const diff: string[] = []
  let addedLines = 0

  // 添加导入语句
  const importRegex = /(import \{[^}]+\} from '\.\/module-[^']+'\n)/
  const lastImportMatch = content.match(importRegex)

  const importLine = `import { ${camelName}Routes } from './module-${kebabName}/routes/${kebabName}-routes'`

  if (lastImportMatch) {
    const lastImportIndex = content.lastIndexOf(lastImportMatch[0]) + lastImportMatch[0].length
    content = content.slice(0, lastImportIndex) + `${importLine}\n` + content.slice(lastImportIndex)
    diff.push(`+ ${importLine}`)
    addedLines++
  } else {
    const firstImportEnd = content.indexOf('\n', content.indexOf('import'))
    content =
      content.slice(0, firstImportEnd + 1) + `${importLine}\n` + content.slice(firstImportEnd + 1)
    diff.push(`+ ${importLine}`)
    addedLines++
  }

  // 添加路由注册
  const routeRegex = /(\.route\('\/api', [a-zA-Z]+Routes\)\n)/
  const lastRouteMatch = content.match(routeRegex)

  const routeLine = `    .route('/api', ${camelName}Routes)`

  if (lastRouteMatch) {
    const lastRouteIndex = content.lastIndexOf(lastRouteMatch[0]) + lastRouteMatch[0].length
    content = content.slice(0, lastRouteIndex) + `${routeLine}\n` + content.slice(lastRouteIndex)
    diff.push(`+ ${routeLine}`)
    addedLines++
  }

  fs.writeFileSync(appPath, content)
  return { success: true, diff: diff.join('\n'), addedLines }
}

function updateSharedModulesIndex(name: string, options: CreateOptions): ModifiedFileResult {
  const indexPath = path.join(templateDir, 'src/shared/modules/index.ts')
  if (!fs.existsSync(indexPath)) {
    console.log(`⚠️  shared/modules/index.ts 不存在: ${indexPath}`)
    return { success: false }
  }

  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  let content = fs.readFileSync(indexPath, 'utf-8')

  if (content.includes(`from './${kebabName}'`)) {
    console.log(`⚠️  shared/modules/index.ts 已经包含 ${kebabName} 模块`)
    return { success: false }
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
  WebSocketStatusSchema,
  type ${pascalName}Message,
  type ${pascalName}Connection,
  type WebSocketStatus,
} from './${kebabName}'`
  } else {
    exports = `
export {
  ${pascalName}Schema,
  Create${pascalName}Schema,
  Update${pascalName}Schema,
  ${pascalName}ListSchema,
  DeleteResultSchema,
  type ${pascalName},
  type Create${pascalName}Input,
  type Update${pascalName}Input,
  type DeleteResult,
} from './${kebabName}'`
  }

  const addedLines = exports.split('\n').length
  const diff = exports
    .trim()
    .split('\n')
    .map(line => `+ ${line}`)
    .join('\n')

  content = content.trimEnd() + exports + '\n'

  fs.writeFileSync(indexPath, content)
  return { success: true, diff, addedLines }
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
  const appResult = updateAppTs(name)
  if (appResult.success) {
    createdFiles.push({
      path: path.join(templateDir, 'src/server/app.ts'),
      type: 'modified',
      diff: appResult.diff,
      lineCount: appResult.addedLines,
    })
  }

  // 更新 shared/modules/index.ts
  const indexResult = updateSharedModulesIndex(name, options)
  if (indexResult.success) {
    createdFiles.push({
      path: path.join(templateDir, 'src/shared/modules/index.ts'),
      type: 'modified',
      diff: indexResult.diff,
      lineCount: indexResult.addedLines,
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
        const lineInfo = file.lineCount ? ` (+${file.lineCount} 行)` : ''
        console.log(`   ${relativePath}${lineInfo}`)
        if (file.diff) {
          console.log()
          console.log('   Diff:')
          file.diff.split('\n').forEach(line => {
            console.log(`   ${line}`)
          })
        }
        console.log()
      })
    }

    // 显示客户端使用示例
    console.log('💻 客户端调用示例：')
    console.log(generateClientUsageExample(options.name, options))

    console.log('📚 相关文档：')
    console.log('   - .claude/rules/31-client-services.md - 客户端服务使用规范')
    if (options.withSSE) {
      console.log('   - .claude/rules/51-sse.md - SSE 开发规范')
      console.log('   - src/client/hooks/useSSE.ts - React Hook 封装')
      console.log('   - src/shared/core/sse-client.ts - SSE 客户端实现')
    } else if (options.withWebSocket) {
      console.log('   - .claude/rules/50-websocket.md - WebSocket 开发规范')
      console.log('   - src/client/hooks/useWebSocket.ts - React Hook 封装')
      console.log('   - src/shared/core/ws-client.ts - WebSocket 客户端实现')
    } else {
      console.log('   - .claude/rules/10-api-type-inference.md - API 类型推导规范')
    }
    console.log()

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
