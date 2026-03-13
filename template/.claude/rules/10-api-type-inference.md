---
paths: src/**/*.ts, src/**/*.tsx
---

# API 类型推导规范

## 🎯 核心价值

本项目通过 **Hono RPC** 实现端到端类型安全，核心优势：

1. **零代码生成的类型共享** - 不需要 OpenAPI 代码生成工具
2. **自动类型推导** - 从服务端定义自动推导客户端类型
3. **重构友好** - 修改服务端类型，客户端自动报错
4. **开发体验极佳** - 完整的 IDE 自动补全和类型检查

## 🔗 链式语法（强制）

**必须使用链式语法定义路由**，确保 Hono RPC 类型推断正确。

```typescript
// ✅ 正确 - 链式语法
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => { ... })
  .openapi(createRoute, async c => { ... })
  .openapi(updateRoute, async c => { ... })

// ❌ 错误 - 非链式语法会导致类型推断丢失
const app = new OpenAPIHono();
app.openapi(listRoute, async c => { ... });
app.openapi(createRoute, async c => { ... });
```

**ESLint 规则**: `require-hono-chain-syntax`

**路径**: `src/server/module-*/routes/*.ts`

## 📦 Schema 定义规范

### 使用 Zod 定义 Schema

```typescript
// ✅ 正确 - 在 shared/modules 中定义
// src/shared/modules/{module}/schemas.ts
import { z } from 'zod'

export const ItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  status: z.enum(['active', 'inactive']),
})

export type Item = z.infer<typeof ItemSchema>
```

### 禁止内联 Schema

```typescript
// ❌ 错误 - 在路由文件中直接定义 Schema
const route = createRoute({
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ id: z.string() }), // ❌ 内联定义
        },
      },
    },
  },
})

// ✅ 正确 - 从 shared 导入
import { ItemSchema } from '@shared/schemas'

const route = createRoute({
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ItemSchema, // ✅ 使用导入的 Schema
        },
      },
    },
  },
})
```

**ESLint 规则**: `no-inline-schema`

**路径**: `src/server/module-*/routes/*.ts`

## 🛡 响应格式规范

### 使用响应辅助函数

```typescript
// ✅ 正确 - 使用辅助函数
import { successResponse, errorResponse } from '@server/utils/route-helpers'

const route = createRoute({
  responses: {
    200: successResponse(ItemSchema, '获取列表'),
    404: errorResponse('未找到'),
  },
})

// ❌ 错误 - 直接定义响应
const route = createRoute({
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(), // ❌ 应使用 z.literal(true)
            data: ItemSchema,
          }),
        },
      },
    },
  },
})
```

**ESLint 规则**: `require-response-helpers`

**路径**: `src/server/module-*/routes/*.ts`

## 🚫 禁止 z.boolean() 定义 success

```typescript
// ❌ 错误 - 使用 z.boolean()
const response = z.object({
  success: z.boolean(), // ❌ 类型推导不正确
  data: ItemSchema,
})

// ✅ 正确 - 使用 z.literal()
const response = z.object({
  success: z.literal(true), // ✅ 正确的类型推导
  data: ItemSchema,
})
```

**ESLint 规则**: `no-boolean-success`

**路径**: `src/server/module-*/routes/*.ts`

## 🔧 参数验证规范

### 使用 c.req.valid() 获取参数

```typescript
// ✅ 正确 - 使用 c.req.valid()
const route = createRoute({
  request: {
    body: { content: { 'application/json': { schema: CreateItemSchema } } },
    params: z.object({ id: z.string() }),
  },
})

export const apiRoutes = new OpenAPIHono().openapi(route, async c => {
  const body = c.req.valid('json') // ✅ 类型安全
  const { id } = c.req.valid('param') // ✅ 类型安全
  // ...
})

// ❌ 错误 - 使用原始方法
export const apiRoutes = new OpenAPIHono().openapi(route, async c => {
  const body = await c.req.json() // ❌ 无类型检查
  const id = c.req.param('id') // ❌ 无类型检查
  // ...
})
```

**ESLint 规则**: `enforce-valid-method`

**路径**: `src/server/module-*/routes/*.ts`

### 参数验证方法映射

| Route Schema      | c.req.valid() 参数   |
| ----------------- | -------------------- |
| `request.body`    | `'json'` 或 `'body'` |
| `request.query`   | `'query'`            |
| `request.params`  | `'param'`            |
| `request.headers` | `'header'`           |
| `request.cookies` | `'cookie'`           |

## 📤 类型导出规范

### 导出 AppType

```typescript
// src/server/app.ts
import { OpenAPIHono } from '@hono/zod-openapi'

export function createApp() {
  const app = new OpenAPIHono().route('/api', apiRoutes)
  // ...

  return app
}

// ✅ 必须导出 AppType
export type AppType = ReturnType<typeof createApp>
```

**ESLint 规则**: 无（最佳实践）

## 🔄 客户端使用规范

### 创建类型安全的客户端

```typescript
// src/client/services/apiClient.ts
import { hc } from 'hono/client'
import type { AppType } from '@server/index'

export const apiClient = hc<AppType>(import.meta.env.API_BASE_URL || '')
```

### 类型安全的 API 调用

```typescript
// ✅ 类型安全的调用
const response = await apiClient.api.items.$get()
const result = await response.json()

if (result.success) {
  // result.data 类型自动推导
  console.log(result.data[0].name)
}

// ✅ POST 请求 - 自动验证请求体
const createResponse = await apiClient.api.items.$post({
  json: { name: 'New Item', status: 'active' },
})

// ✅ 带路径参数的请求
const itemResponse = await apiClient.api.items[':id'].$get({
  param: { id: '123' },
})
```

## 🖼️ 媒体类型推导

### Content-Type 到返回类型映射

本项目扩展了 Hono 的类型推导，支持以下媒体类型：

| Content-Type              | 客户端方法                | 返回类型                              |
| ------------------------- | ------------------------- | ------------------------------------- |
| `application/json`        | `$get()`, `$post()`, etc. | `Promise<ClientResponse<T>>`          |
| `text/plain`              | `$get()`                  | `Promise<ClientResponse<string>>`     |
| `text/event-stream`       | `$sse()`                  | `SSEClient<{ events: ... }>`          |
| `websocket`               | `$ws()`                   | `WSClient<{ rpc: ..., events: ... }>` |
| `image/*`                 | `$image()`                | `Promise<Blob>`                       |
| `image/svg+xml`           | `$svg()`                  | `Promise<string>`                     |
| `application/*` (非 json) | `$download()`             | `Promise<Blob>`                       |

### 图片类型示例

```typescript
// 服务端定义
const getAvatarRoute = createRoute({
  method: 'get',
  path: '/avatar/:id',
  responses: {
    200: {
      content: {
        'image/png': { schema: z.any().openapi({ type: 'string', format: 'binary' }) },
        'image/jpeg': { schema: z.any().openapi({ type: 'string', format: 'binary' }) },
      },
      description: 'User avatar',
    },
  },
})

// 客户端调用 - 自动推导为 Promise<Blob>
const blob = await apiClient.api.avatar[':id'].$image({ param: { id: '123' } })
const imageUrl = URL.createObjectURL(blob)
```

### SVG 类型示例

```typescript
// 服务端定义
const getIconRoute = createRoute({
  method: 'get',
  path: '/icon/:name',
  responses: {
    200: {
      content: {
        'image/svg+xml': { schema: z.string() },
      },
      description: 'SVG icon',
    },
  },
})

// 客户端调用 - 自动推导为 Promise<string>
const svgString = await apiClient.api.icon[':name'].$svg({ param: { name: 'home' } })
document.querySelector('#icon').innerHTML = svgString
```

### 文件下载示例

```typescript
// 服务端定义
const exportRoute = createRoute({
  method: 'get',
  path: '/export',
  responses: {
    200: {
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
        'text/csv': { schema: z.string() },
      },
      description: 'Export data',
    },
  },
})

// 客户端调用 - 自动推导为 Promise<Blob>
const blob = await apiClient.api.export.$download()
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'data.xlsx'
a.click()
URL.revokeObjectURL(url)
```

**注意**: 对于二进制类型，使用 `z.any().openapi({ type: 'string', format: 'binary' })` 而不是 `z.instanceof(Blob)`。

## 🚫 Anti-Patterns

```typescript
// ❌ 不要使用 any
const result: any = await response.json()

// ✅ 应该使用类型守卫
const result = await response.json()
if (result.success) {
  // result.data 类型安全
}

// ❌ 不要重复定义类型
interface ClientItem {
  id: number
  name: string
}

// ✅ 应该复用共享类型
import type { Item } from '@shared/schemas'

// ❌ 不要硬编码 URL
fetch('/api/items/' + id)

// ✅ 应该使用类型安全的客户端
apiClient.api.items[':id'].$get({ param: { id } })
```

## 📚 相关文档

- [Server API 规范](./20-server-api.md) - 服务端路由定义
- [Shared Types 规范](./40-shared-types.md) - Schema 定义规范
- [Testing 规范](./60-testing-standards.md) - 测试编写规范
