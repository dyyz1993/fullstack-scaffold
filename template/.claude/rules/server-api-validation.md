---
paths: server/**/*.ts
---

# Server API Development Rules

## 🏗 Architecture Layers

### 项目结构

服务端应遵循分层架构：

- **Routes** - 定义端点，应用验证器，委托逻辑给 Services
- **Services** - 实现核心业务逻辑，与 Hono Context 解耦
- **Schemas** - 定义 Zod schemas 用于请求/响应验证
- **Utils** - 共享工具函数

示例：
```
src/server/
├── index.ts                    # 服务器入口
├── module-todos/
│   ├── routes/
│   │   └── todos-routes.ts     # Todo 路由
│   ├── services/
│   │   └── todo-service.ts     # Todo 业务逻辑
│   └── __tests__/
│       ├── todos-routes.test.ts
│       └── todo-service.test.ts
├── shared/
│   ├── db.ts                   # 数据库连接
│   └── utils.ts                # 工具函数
```

## 🛡 Validation & Type Safety

### OpenAPIHono 模式 (推荐)

使用 `@hono/zod-openapi` 实现类型安全的 API：

```typescript
// server/module-todos/routes/todos-routes.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as todoService from '../services/todo-service';

// Schema 定义
const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
});

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

// 注册路由 - 使用 CHAIN SYNTAX
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => {
    const todos = await todoService.listTodos();
    return c.json({ success: true, data: todos });
  })
  .openapi(createRouteDef, async (c) => {
    const data = c.req.valid('json');
    const todo = await todoService.createTodo(data);
    return c.json({ success: true, data: todo }, 201);
  })
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Todo API',
    },
  });
```

### 链式语法 (CHAIN SYNTAX)

**重要**: 使用链式语法确保 Hono RPC 类型推断正确：

```typescript
// ✅ 正确 - 链式语法
const app = new Hono()
  .use('*', cors())
  .route('/api', apiRoutes)
  .get('/health', (c) => c.json({ status: 'ok' }));

// ❌ 错误 - 分开定义会丢失类型推断
const app = new Hono();
app.use('*', cors());
app.route('/api', apiRoutes);
```

## 🔒 Security Requirements

- 所有用户输入必须验证
- 文件操作需要路径验证（防止目录遍历）
- SQL 查询使用参数化（防止 SQL 注入）
- 实施适当的错误处理

## 🚥 Response & Error Handling

### 标准响应格式

```typescript
// 成功
{ success: true, data: any }

// 错误
{ success: false, error: string }
```

### HTTP 状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 验证失败或业务逻辑错误
- `404` - 资源不存在
- `500` - 服务器错误

### 错误处理示例

```typescript
.openapi(getRoute, async (c) => {
  const id = parseInt(c.req.param('id'));
  const todo = await todoService.getTodo(id);
  if (!todo) {
    return c.json({ success: false, error: 'Todo not found' }, 404);
  }
  return c.json({ success: true, data: todo });
})
```

## 📝 Best Practices

### 命名规范

- 函数：camelCase
- 类/接口/Zod Schema：PascalCase
- 路由：kebab-case

### 导入规范

```typescript
// ✅ 使用路径别名
import { Todo, CreateTodoInput } from '@shared/types';
import { initializeDb } from '@server/shared/db';

// ❌ 避免相对路径
import { Todo } from '../../shared/types';
```

### 异步与日志

- 所有 I/O 使用 async/await
- API 调用必须有错误处理
- 服务端操作需要描述性日志

## 🚀 Module Pattern

每个业务模块应遵循以下结构：

```typescript
// routes/todos-routes.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { listTodos, createTodo, updateTodo, deleteTodo } from '../services/todo-service';

// 定义 schemas
const TodoSchema = z.object({ ... });
const CreateTodoSchema = z.object({ ... });

// 定义路由
const listRoute = createRoute({ ... });
const createRoute = createRoute({ ... });

// 注册路由
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => {
    const todos = await listTodos();
    return c.json({ success: true, data: todos });
  })
  .openapi(createRoute, async (c) => {
    const input = c.req.valid('json');
    const todo = await createTodo(input);
    return c.json({ success: true, data: todo }, 201);
  })
  .doc('/docs', { ... });
```

```typescript
// services/todo-service.ts
import { sqlite } from '../../shared/db';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@shared/types';

export async function listTodos(): Promise<Todo[]> {
  const stmt = sqlite.prepare('SELECT * FROM todos ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  // 业务逻辑实现
}
```

## 🔧 OpenAPI 文档

使用 OpenAPIHono 自动生成 API 文档：

```typescript
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => { ... })
  .openapi(createRoute, async (c) => { ... })
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Todo API',
      description: 'A simple Todo API',
    },
  });
```

访问 `/docs` 即可查看 Swagger UI 文档。
