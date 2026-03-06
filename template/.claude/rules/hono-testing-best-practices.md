# Hono 测试最佳实践：使用 testClient 实现类型安全测试

## 概述

Hono 提供了 `testClient` 工具（位于 `hono/testing` 包），可以为测试提供完整的类型安全支持。这意味着：

- ✅ **路径自动补全**：`client.api.todos` 自动提示
- ✅ **方法自动提示**：`$get`, `$post`, `$put`, `$delete`
- ✅ **请求体类型检查**：写错字段或类型会直接报错
- ✅ **响应类型推导**：自动推导响应数据类型
- ✅ **重构友好**：修改 API 后测试代码自动报错

## 对比：传统方式 vs 类型安全方式

### ❌ 传统方式（无类型安全）

```typescript
import app from './app'

describe('Todo Routes', () => {
  it('should create a todo', async () => {
    // ❌ 路径是字符串，容易拼写错误
    const res = await app.request('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ❌ 需要手动 JSON 序列化
      body: JSON.stringify({ title: 'New Todo' }),
    })

    expect(res.status).toBe(201)

    // ❌ 返回类型是 any，没有类型检查
    const data = await res.json()
    // ❌ 字段名拼写错误不会被发现
    expect(data.data.titl).toBe('New Todo') // 应该是 title
  })
})
```

**问题：**

1. 路径 `/api/todos` 是字符串，拼写错误不会被发现
2. 请求体需要手动 `JSON.stringify`
3. 响应类型是 `any`，没有类型检查
4. 修改 API 后，测试代码不会自动报错

### ✅ 类型安全方式（使用 testClient）

```typescript
import { testClient } from 'hono/testing'
import app from './app'

describe('Todo Routes with Type Safety', () => {
  it('should create a todo with type safety', async () => {
    const client = testClient(app)

    // ✅ 路径自动补全，拼写错误会报错
    // ✅ 方法自动提示：$get, $post, $put, $delete
    const res = await client.api.todos.$post({
      json: {
        title: 'New Todo', // ✅ 类型检查，字段错误会报错
        description: 'Optional', // ✅ 可选字段提示
      },
    })

    expect(res.status).toBe(201)

    // ✅ 响应类型自动推导
    const data = await res.json()
    // ✅ 字段名有类型检查，拼写错误会报错
    expect(data.data.title).toBe('New Todo')
  })
})
```

**优势：**

1. 路径自动补全：`client.api.todos`
2. 方法自动提示：`$get`, `$post`, `$put`, `$delete`
3. 请求体类型检查：写错字段或类型会直接报错
4. 响应类型自动推导
5. 重构友好：修改 API 后测试代码自动报错

## 完整示例

### GET 请求（带查询参数）

```typescript
const client = testClient(app)

// ✅ 查询参数类型检查
const res = await client.api.todos.$get({
  query: {
    status: 'completed', // ✅ 自动提示可选值
  },
})
```

### POST 请求（带请求体）

```typescript
const client = testClient(app)

// ✅ 请求体类型检查
const res = await client.api.todos.$post({
  json: {
    title: 'New Todo', // ✅ 必填字段
    description: 'Optional', // ✅ 可选字段
  },
})
```

### PUT 请求（带路径参数）

```typescript
const client = testClient(app)

// ✅ 路径参数类型检查
const res = await client.api.todos[':id'].$put({
  param: { id: '123' }, // ✅ 自动提示需要 id 参数
  json: {
    title: 'Updated Todo',
    status: 'completed', // ✅ 自动提示可选值
  },
})
```

### DELETE 请求（带路径参数）

```typescript
const client = testClient(app)

// ✅ 路径参数类型检查
const res = await client.api.todos[':id'].$delete({
  param: { id: '123' },
})
```

## 实际项目中的应用

项目中已经创建了示例测试文件：

- [todos-route-rpc.test.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-todos/__tests__/todos-route-rpc.test.ts) - 使用 testClient 的类型安全测试
- [todos-route.test.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-todos/__tests__/todos-route.test.ts) - 传统测试方式（保留用于对比）

## 测试结果

```bash
npm test -- todos-route-rpc.test.ts

 ✓ src/server/module-todos/__tests__/todos-route-rpc.test.ts (8 tests) 19ms
   ✓ Todo Routes with Type-Safe Test Client (8)
     ✓ GET /api/todos (2)
       ✓ should return empty array
       ✓ should return todos list
     ✓ POST /api/todos (2)
       ✓ should create a todo with type safety
       ✓ should reject empty title
     ✓ GET /api/todos/:id (2)
       ✓ should return 404 for non-existent todo
       ✓ should return todo by id with type safety
     ✓ PUT /api/todos/:id (1)
       ✓ should update todo with type safety
     ✓ DELETE /api/todos/:id (1)
       ✓ should delete todo with type safety
```

## 最佳实践建议

1. **新项目**：直接使用 `testClient` 进行类型安全测试
2. **现有项目**：逐步迁移到 `testClient`，享受类型安全的优势
3. **团队协作**：使用 `testClient` 可以减少因拼写错误导致的测试失败
4. **重构时**：修改 API 后，测试代码会自动报错，确保测试与实现同步

## 总结

使用 Hono 的 `testClient` 可以让测试代码：

- 🎯 **更安全**：编译时捕获错误
- 🚀 **更高效**：IDE 自动补全和类型提示
- 🔧 **更易维护**：重构时自动更新测试代码
- 📚 **更易学习**：类型提示帮助理解 API 结构

这是 Hono 官方推荐的测试方式，充分利用了 TypeScript 的类型系统优势！
