---
paths: src/**/*.ts, src/**/*.tsx
---

# API 复用与类型推导规范

## 🎯 核心价值

本项目通过 **Hono RPC** 实现端到端类型安全，核心优势：

1. **零代码生成的类型共享** - 不需要 OpenAPI 代码生成工具
2. **自动类型推导** - 从服务端定义自动推导客户端类型
3. **重构友好** - 修改服务端类型，客户端自动报错
4. **开发体验极佳** - 完整的 IDE 自动补全和类型检查

## 🏗 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Server (Hono)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  OpenAPIHono + Zod Schemas                       │  │
│  │  - 路由定义                                       │  │
│  │  - 请求/响应验证                                  │  │
│  │  - 导出 AppType                                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
                   export type AppType
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Client (React)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  hc<AppType>(baseUrl)                            │  │
│  │  - 自动推导所有路由类型                           │  │
│  │  - 完整的路径补全                                 │  │
│  │  - 请求/响应类型检查                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 📦 服务端定义规范

### 1. Schema 定义 (Zod)

```typescript
// src/shared/schemas/todos.ts
import { z } from 'zod';

export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: TodoStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: TodoStatusSchema.optional(),
});

// 导出 TypeScript 类型
export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;
```

### 2. 路由定义 (OpenAPIHono)

```typescript
// src/server/module-todos/routes/todos-routes.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as todoService from '../services/todo-service';
import { TodoSchema, CreateTodoSchema, UpdateTodoSchema } from '@shared/schemas';

// 定义路由
const listRoute = createRoute({
  method: 'get',
  path: '/todos',
  tags: ['todos'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(TodoSchema),
          }),
        },
      },
      description: 'List all todos',
    },
  },
});

const createRouteDef = createRoute({
  method: 'post',
  path: '/todos',
  tags: ['todos'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTodoSchema,
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
            data: TodoSchema,
          }),
        },
      },
      description: 'Create a new todo',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
          }),
        },
      },
      description: 'Invalid input',
    },
  },
});

// 注册路由 - 使用链式语法
export const todoRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => {
    const todos = await todoService.listTodos();
    return c.json({ success: true, data: todos });
  })
  .openapi(createRouteDef, async (c) => {
    const data = c.req.valid('json');
    const todo = await todoService.createTodo(data);
    return c.json({ success: true, data: todo }, 201);
  });
```

### 3. 导出 AppType

```typescript
// src/server/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { todoRoutes } from './module-todos/routes';

const app = new Hono()
  .use('/*', cors())
  .route('/api', todoRoutes)
  .route('/api', notificationRoutes)
  .route('/api', websocketRoutes);

// 🔑 关键：导出 AppType 供客户端使用
export type AppType = typeof app;
export default app;
```

## 📱 客户端使用规范

### 1. 创建 API Client

```typescript
// src/client/services/apiClient.ts
import { hc } from 'hono/client';
import type { AppType } from '@server/index';

// 类型安全的 API 客户端
export const apiClient = hc<AppType>(import.meta.env.API_BASE_URL || '');

// 导出类型守卫
export function isSuccess<T>(response: unknown): response is ApiSuccess<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === true &&
    'data' in response
  );
}

export function isError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === false &&
    'error' in response
  );
}
```

### 2. 类型安全的 API 调用

```typescript
// ✅ GET 请求 - 自动推导返回类型
const response = await apiClient.api.todos.$get();
const result = await response.json();

if (isSuccess<Todo[]>(result)) {
  // result.data 类型自动推导为 Todo[]
  console.log(result.data[0].title); // ✅ 类型安全
}

// ✅ POST 请求 - 自动验证请求体类型
const createResponse = await apiClient.api.todos.$post({
  json: {
    title: 'New Todo',
    description: 'Optional description',
  },
});

const createResult = await createResponse.json();
if (isSuccess<Todo>(createResult)) {
  console.log('Created:', createResult.data.id);
}

// ✅ PUT 请求 - 路径参数自动推导
const updateResponse = await apiClient.api.todos[':id'].$put({
  param: { id: '123' },
  json: { status: 'completed' },
});

// ✅ DELETE 请求
const deleteResponse = await apiClient.api.todos[':id'].$delete({
  param: { id: '123' },
});
```

### 3. 在 React 组件中使用

```typescript
import { apiClient, isSuccess } from '@client/services/apiClient';
import type { Todo } from '@shared/schemas';

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const fetchTodos = async () => {
      const response = await apiClient.api.todos.$get();
      const result = await response.json();
      
      if (isSuccess<Todo[]>(result)) {
        setTodos(result.data);
      }
    };

    fetchTodos();
  }, []);

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
};
```

### 4. 在 Zustand Store 中使用

```typescript
import { create } from 'zustand';
import { apiClient, isSuccess } from '@client/services/apiClient';
import type { Todo, CreateTodoInput } from '@shared/schemas';

interface TodoState {
  todos: Todo[];
  fetchTodos: () => Promise<void>;
  createTodo: (input: CreateTodoInput) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],

  fetchTodos: async () => {
    const response = await apiClient.api.todos.$get();
    const result = await response.json();
    
    if (isSuccess<Todo[]>(result)) {
      set({ todos: result.data });
    }
  },

  createTodo: async (input: CreateTodoInput) => {
    const response = await apiClient.api.todos.$post({ json: input });
    const result = await response.json();
    
    if (isSuccess<Todo>(result)) {
      set(state => ({ todos: [...state.todos, result.data] }));
    }
  },
}));
```

## 🔄 特殊场景的类型推导

### 1. WebSocket 协议推导

```typescript
// 服务端：返回协议类型
export const websocketRoutes = new OpenAPIHono()
  .openapi(wsRoute, async (c) => {
    return c.json({ protocol: 'AppWSProtocol' as const });
  });

export type { AppWSProtocol } from '@shared/schemas/ws-protocol';

// 客户端：自动推导协议类型
import { createWS, InferWSProtocol } from '@client/services/wsClient';

const ws = createWS(apiClient.api.ws);
// ws 类型自动推导为 WSClient<AppWSProtocol>

// 类型安全的 RPC 调用
const result = await ws.call('ping', undefined);
// result.pong 自动推导为 number

// 类型安全的事件监听
ws.on('notification', (payload) => {
  // payload 自动推导为 { id: string; message: string }
});
```

### 2. SSE 流推导

```typescript
// 服务端：定义 SSE 流
export const notificationRoutes = new OpenAPIHono()
  .openapi(streamRoute, async (c) => {
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        event: 'notification',
        data: JSON.stringify(notification),
      });
    });
  });

// 客户端：自动推导流数据类型
const responsePromise = apiClient.api.notifications.stream.$get();

for await (const data of consumeStream<AppNotification>(responsePromise)) {
  // data 类型自动推导为 AppNotification
  console.log(data.title);
}
```

### 3. 查询参数推导

```typescript
// 服务端：定义查询参数
const listRoute = createRoute({
  method: 'get',
  path: '/todos',
  request: {
    query: z.object({
      status: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: { ... },
});

// 客户端：自动推导查询参数
const response = await apiClient.api.todos.$get({
  query: {
    status: 'completed',
    limit: '10',
  },
});
```

## 🎯 类型复用策略

### 1. 共享类型定义

```typescript
// src/shared/types.ts
export type { Todo, CreateTodoInput, UpdateTodoInput } from './schemas/todos';
export type { AppNotification } from './schemas/notifications';
export type { AppWSProtocol } from './schemas/ws-protocol';
```

### 2. 服务端使用共享类型

```typescript
// src/server/module-todos/services/todo-service.ts
import type { Todo, CreateTodoInput } from '@shared/types';

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  // ...
}
```

### 3. 客户端使用共享类型

```typescript
// src/client/stores/todoStore.ts
import type { Todo, CreateTodoInput } from '@shared/types';

interface TodoState {
  todos: Todo[];
  createTodo: (input: CreateTodoInput) => Promise<void>;
}
```

## 🔧 高级类型推导

### 1. 提取路由类型

```typescript
import type { InferResponseType, InferRequestType } from 'hono/client';

// 提取响应类型
type ListTodosResponse = InferResponseType<typeof apiClient.api.todos.$get>;
// { success: boolean; data: Todo[] }

// 提取请求类型
type CreateTodoRequest = InferRequestType<typeof apiClient.api.todos.$post>;
// { json: CreateTodoInput }
```

### 2. 提取路由参数类型

```typescript
// 从路由定义提取参数类型
type TodoRoutesParams = {
  id: string;
};

const response = await apiClient.api.todos[':id'].$get({
  param: { id: '123' }, // ✅ 类型检查
});
```

### 3. 条件类型推导

```typescript
// 根据响应状态码推导类型
type SuccessResponse<T> = Extract<T, { status: 200 }>;
type ErrorResponse = Extract<T, { status: 400 | 404 }>;

// 使用
type ListSuccess = SuccessResponse<ListTodosResponse>;
type ListError = ErrorResponse<ListTodosResponse>;
```

## 📊 类型推导流程图

```
┌─────────────────────────────────────────────────────┐
│  1. Server: Zod Schema 定义                         │
│     const TodoSchema = z.object({ ... })            │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  2. Server: OpenAPIHono 路由定义                    │
│     createRoute({                                   │
│       request: { body: { schema: TodoSchema } },    │
│       responses: { 200: { schema: TodoSchema } }    │
│     })                                              │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  3. Server: 导出 AppType                            │
│     export type AppType = typeof app                │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  4. Client: 创建类型安全的客户端                     │
│     const apiClient = hc<AppType>(baseUrl)          │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  5. Client: 自动类型推导                            │
│     apiClient.api.todos.$post({ json: {...} })      │
│     // ✅ 请求体类型自动检查                         │
│     // ✅ 响应类型自动推导                           │
└─────────────────────────────────────────────────────┘
```

## 🚫 Anti-Patterns

```typescript
// ❌ 不要使用 any
const result: any = await response.json();

// ✅ 应该使用类型守卫
const result = await response.json();
if (isSuccess<Todo>(result)) {
  // result.data 类型安全
}

// ❌ 不要重复定义类型
interface ClientTodo {
  id: number;
  title: string;
}

// ✅ 应该复用共享类型
import type { Todo } from '@shared/types';

// ❌ 不要硬编码 URL
fetch('/api/todos/' + id);

// ✅ 应该使用类型安全的客户端
apiClient.api.todos[':id'].$get({ param: { id } });

// ❌ 不要手动维护类型
type APIRoutes = '/api/todos' | '/api/notifications';

// ✅ 应该从 AppType 自动推导
type APIRoutes = keyof AppType['routes'];
```

## 🎯 最佳实践总结

### 服务端

1. ✅ 使用 Zod 定义 Schema
2. ✅ 使用 OpenAPIHono 定义路由
3. ✅ 导出 AppType 供客户端使用
4. ✅ 使用链式语法确保类型推导
5. ✅ 共享类型放在 `src/shared/`

### 客户端

1. ✅ 使用 `hc<AppType>` 创建客户端
2. ✅ 使用类型守卫处理响应
3. ✅ 复用 `@shared/types` 类型
4. ✅ 在 Store 中集中管理 API 调用
5. ✅ 利用 IDE 自动补全

### 类型推导

1. ✅ 从 Schema 自动生成类型
2. ✅ 从路由自动推导 API 类型
3. ✅ 从协议自动推导 WebSocket 类型
4. ✅ 从流定义自动推导 SSE 类型
5. ✅ 避免手动维护类型定义

## 📚 相关文档

- [Server API 规范](./server-api-validation.md)
- [Client Service 规范](./client-service-rules.md)
- [WebSocket 规范](./websocket-rules.md)
- [SSE 规范](./sse-rules.md)
- [Shared Types 规范](./shared-types-rules.md)
