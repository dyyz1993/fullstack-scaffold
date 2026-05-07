# SSE 连接错误修复计划

## 问题描述

```
SSE http://localhost:5174/api/agents/agent_62b4dc726db0/chat/stream net::ERR_ABORTED 400 (Bad Request)
useSSE.ts:46 Failed to connect SSE: TypeError: newClient.onStatusChange is not a function
```

## 问题根因分析

### 调用链分析

1. **`useChatSSEConnection.ts`** 调用：

   ```typescript
   return apiClient.api.agents[':id'].chat.stream.$sse({
     param: { id: currentAgent.id },
   })
   ```

2. **Hono** **`hc`** **客户端** (`client.js` 第 168-186 行) 处理 `$sse`：

   ```javascript
   if (method === "sse") {
     const establishSSE = options?.sse || ((u) => new EventSource(u));
     return establishSSE(targetUrl.toString());  // 直接返回，不是 Promise
   }
   ```

3. **`apiClient.ts`** 定义 SSE 工厂：

   ```typescript
   sse: url => {
     const token = getAuthToken()
     const headers: Record<string, string> = {}
     if (token) {
       headers['Authorization'] = `Bearer ${token}`
     }
     return new SSEClientImpl(url, headers)  // 返回 SSEClientImpl 实例
   }
   ```

### 根本原因

**类型不匹配**：`useSSE` hook 期望 `route` 参数返回 `Promise<SSEClient<T>>`，但 Hono 的 `$sse()` 方法直接返回 `SSEClient` 实例（同步）。

```typescript
// useSSE.ts 期望
route: (deps?: D) => Promise<SSEClient<T>>

// 实际返回
apiClient.api.agents[':id'].chat.stream.$sse({...})  // 返回 SSEClientImpl，不是 Promise
```

### HTTP 400 错误

HTTP 400 错误是另一个问题：

* 服务端 SSE 路由使用 OpenAPI Hono 的 `createRoute`

* 当认证 token 无效或缺失时，返回 400 错误

* 这会导致 `SSEClientImpl._connect()` 中的 `fetch` 失败

## 修复方案对比

### 方案 A: 修改 `useChatSSEConnection.ts`（推荐）

**修改量**: 1 个文件，1 行代码

将 `$sse()` 返回值包装为 Promise：

```typescript
// 修改前
return apiClient.api.agents[':id'].chat.stream.$sse({
  param: { id: currentAgent.id },
})

// 修改后
return Promise.resolve(
  apiClient.api.agents[':id'].chat.stream.$sse({
    param: { id: currentAgent.id },
  })
)
```

### 方案 B: 修改 `useSSE.ts` 支持同步返回

**修改量**: 1 个文件，约 5 行代码

修改类型签名以支持同步返回：

```typescript
// 修改前
route: (deps?: D) => Promise<SSEClient<T>>

// 修改后
route: (deps?: D) => Promise<SSEClient<T>> | SSEClient<T>
```

并在 `connect` 函数中处理：

```typescript
// 修改前
const newClient = await routeRef.current(depsRef.current)

// 修改后
const result = routeRef.current(depsRef.current)
const newClient = result instanceof Promise ? await result : result
```

## 推荐方案

**推荐方案 A**，原因：

1. 修改量最小（1 行代码）
2. 不影响其他使用 `useSSE` 的地方
3. 保持 `useSSE` 的 API 不变

## 实现步骤

1. 修改 `src/client/hooks/useChatSSEConnection.ts`，将 `$sse()` 返回值包装为 Promise
2. 验证 SSE 连接正常工作

