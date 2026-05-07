# SSE 连接错误分析计划

## 问题现象

用户报告了以下错误：
1. **HTTP 错误**: `SSE http://localhost:5173/api/agents/agent_62b4dc726db0/chat/stream net::ERR_ABORTED 400 (Bad Request)`
2. **JavaScript 错误**: `TypeError: newClient.onStatusChange is not a function at useSSE.ts:38:17`

## 根本原因分析（已确认）

### 问题 1: HTTP 400 Bad Request（主要原因）

**这是导致整个错误的根本原因！**

从错误堆栈和代码分析，400 错误由以下原因引起：

1. **认证问题**：
   - 客户端在 [apiClient.ts:58-65](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/services/apiClient.ts#L58-L65) 中配置了 SSE 客户端，会自动添加 Authorization header
   - 但服务器端可能没有正确处理认证，或者 token 无效/过期
   - **关键**：SSE 连接使用的是 GET 请求，认证 token 必须通过 header 传递

2. **路由参数问题**：
   - URL 中使用了 `agent_62b4dc726db0` 作为 agent ID
   - 服务器端在 [agent-routes.ts:284-297](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-agent/routes/agent-routes.ts#L284-L297) 会验证 agent 是否存在
   - 如果 agent 不存在或用户无权访问，会返回 404，但可能在某些情况下返回 400

### 问题 2: TypeError: newClient.onStatusChange is not a function（次要原因）

**这个错误是 HTTP 400 错误的连锁反应！**

#### Hono RPC Client 的 $sse() 方法实现

在 `node_modules/hono/dist/client/client.js:168-186` 中：

```javascript
if (method === "sse") {
  const sseUrl = replaceUrlProtocol(
    opts.args[0] && opts.args[0].param ? replaceUrlParam(url, opts.args[0].param) : url,
    "http"
  );
  const targetUrl = new URL(sseUrl);
  const queryParams = opts.args[0]?.query;
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => targetUrl.searchParams.append(key, item));
      } else {
        targetUrl.searchParams.set(key, value);
      }
    });
  }
  const establishSSE = options?.sse || ((u) => new EventSource(u));
  return establishSSE(targetUrl.toString());
}
```

**关键发现**：
- `$sse()` 方法会调用 `options.sse` 函数（如果提供）
- 该函数接收一个 **字符串 URL** 作为参数
- 返回值应该是 SSE 客户端实例

#### 客户端配置

在 [apiClient.ts:58-65](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/services/apiClient.ts#L58-L65)：

```typescript
sse: url => {
  const token = getAuthToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return new SSEClientImpl(url, headers)
},
```

这个配置看起来是正确的，返回了 `SSEClientImpl` 实例。

#### Hono 类型定义

在 `node_modules/hono/dist/types/client/types.d.ts:96-102`：

```typescript
& (S['$get'] extends {
    outputFormat: infer F;
    output: infer O;
} ? 'sse' extends F ? S['$get'] extends {
    input: infer I;
} ? {
    $sse: (args?: I) => SSEClientFromOutput<O>;
} : {} : {} : {})
```

在 `node_modules/hono/dist/types/client/ws-client.d.ts:31-40`：

```typescript
export interface SSEClient<T = SSEProtocol> {
  readonly status: 'connecting' | 'open' | 'closed'

  on<K extends keyof T['events']>(type: K, handler: (payload: T['events'][K]) => void): () => void

  onStatusChange(handler: (status: 'connecting' | 'open' | 'closed') => void): () => void
  onError(handler: (error: Error) => void): () => void

  abort(): void
}
```

**结论**：
- Hono 的类型系统期望 `$sse()` 返回 `SSEClient` 接口
- `SSEClientImpl` 类确实实现了这个接口（见 [sse-client.ts:162-168](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/shared/core/sse-client.ts#L162-L168)）
- 所以类型是匹配的

#### 真正的问题

**问题在于 HTTP 400 错误导致 SSE 连接失败！**

当 HTTP 请求返回 400 时：
1. `SSEClientImpl` 的 `_connect()` 方法会抛出错误（见 [sse-client.ts:65-67](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/shared/core/sse-client.ts#L65-L67)）
2. 错误被捕获并触发重连逻辑（见 [sse-client.ts:115-124](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/shared/core/sse-client.ts#L115-L124)）
3. 但在 `useSSE.ts` 中，`newClient.onStatusChange()` 调用发生在连接之前

**但是！** 错误信息说 `newClient.onStatusChange is not a function`，这意味着 `newClient` 不是 `SSEClientImpl` 实例！

**可能的原因**：
1. Hono 的 `$sse()` 方法在某些情况下可能返回 `EventSource` 而不是自定义客户端
2. 或者 `options.sse` 配置没有正确传递到 Hono 客户端

## 实施步骤

### 步骤 1: 检查 Hono 版本和类型定义
- 确认 Hono 版本是否支持自定义 SSE 客户端
- 检查类型定义是否正确

### 步骤 2: 验证 SSE 客户端实例
- 在 `useSSE.ts` 中添加日志，检查 `newClient` 的实际类型
- 验证 `newClient` 是否真的是 `SSEClientImpl` 实例

### 步骤 3: 修复 HTTP 400 错误
- 检查服务器端的认证逻辑
- 验证 agent ID 是否有效
- 检查 SSE 端点的实现

### 步骤 4: 修复类型错误
- 如果 `newClient` 不是 `SSEClientImpl`，需要调整 `apiClient.ts` 的配置
- 或者修改 `useSSE.ts` 以适应实际的返回类型

## 可能的解决方案

### 方案 A: 修复 HTTP 400 错误（最可能）
1. 检查认证 token 是否有效
2. 验证 agent ID 是否存在
3. 检查服务器端日志

### 方案 B: 调整 SSE 客户端配置
如果 Hono 版本不支持自定义 SSE 客户端，可能需要：
1. 升级 Hono 到支持自定义 SSE 的版本
2. 或者使用其他方式建立 SSE 连接

### 方案 C: 修改 useSSE Hook
如果返回的对象类型不匹配，可能需要：
1. 调整 `useSSE` 以适应不同的 SSE 客户端类型
2. 添加类型检查和错误处理

## 验证步骤

1. 添加调试日志，检查 `newClient` 的类型和方法
2. 检查服务器端日志，确认 400 错误的具体原因
3. 验证认证流程是否正常工作
4. 测试修复后的 SSE 连接

---

## 最终诊断结果（已更新）

### 重要发现：Hono 补丁已应用

经过检查，我发现项目已经对 Hono 应用了补丁（`patches/hono+4.12.7.patch`），该补丁**添加了对自定义 SSE 客户端的支持**！

**补丁内容**：
- 在 `hono/dist/client/client.js` 中添加了 `$sse()` 方法的实现
- 在 `hono/dist/types/client/types.d.ts` 中添加了 SSE 相关的类型定义
- 创建了 `hono/dist/types/client/ws-client.d.ts` 文件，定义了 `SSEClient` 接口

**补丁版本**：4.12.7
**当前安装版本**：4.12.9

### 版本不匹配问题

**这是问题的真正原因！**

- 补丁文件是为 Hono **4.12.7** 创建的
- 但当前安装的是 Hono **4.12.9**
- 补丁可能没有被正确应用到 4.12.9 版本

让我验证补丁是否被正确应用...

### 验证结果

检查 `node_modules/hono/dist/client/client.js:168-186`，发现补丁**已经被应用**：

```javascript
if (method === "sse") {
  const sseUrl = replaceUrlProtocol(
    opts.args[0] && opts.args[0].param ? replaceUrlParam(url, opts.args[0].param) : url,
    "http"
  );
  const targetUrl = new URL(sseUrl);
  const queryParams = opts.args[0]?.query;
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => targetUrl.searchParams.append(key, item));
      } else {
        targetUrl.searchParams.set(key, value);
      }
    });
  }
  const establishSSE = options?.sse || ((u) => new EventSource(u));
  return establishSSE(targetUrl.toString());
}
```

### 真正的问题

既然补丁已经应用，那么问题出在哪里？

**关键代码分析**：

```javascript
const establishSSE = options?.sse || ((u) => new EventSource(u));
return establishSSE(targetUrl.toString());
```

这意味着：
1. 如果 `options.sse` 存在，会调用它并返回自定义 SSE 客户端
2. 否则，会创建原生的 `EventSource` 对象

**问题可能在于**：
1. `options.sse` 没有被正确传递到 Hono 客户端
2. 或者在某些情况下 `options` 对象为 `undefined`

### 核心问题：HTTP 400 Bad Request

**这才是导致整个错误的根本原因！**

从错误信息来看：
- SSE 请求返回 400 Bad Request
- 这意味着服务器端拒绝了请求

**可能的原因**：
1. **认证问题**：
   - Token 无效或过期
   - Token 没有被正确传递到 SSE 请求
   
2. **Agent ID 问题**：
   - Agent ID `agent_62b4dc726db0` 不存在
   - 用户无权访问该 agent

3. **服务器端验证**：
   - 服务器端可能有额外的验证逻辑
   - SSE 端点可能需要特定的参数或 header

### 解决方案

#### 方案 1: 添加调试日志（推荐第一步）

在 [apiClient.ts:58-65](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/services/apiClient.ts#L58-L65) 中添加日志：

```typescript
sse: url => {
  console.log('[SSE] Creating SSE client for URL:', url)
  const token = getAuthToken()
  console.log('[SSE] Token exists:', !!token)
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const client = new SSEClientImpl(url, headers)
  console.log('[SSE] Client created:', client)
  console.log('[SSE] Client has onStatusChange:', typeof client.onStatusChange === 'function')
  return client
},
```

在 [useSSE.ts:35-40](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/shared/hooks/useSSE.ts#L35-L40) 中添加日志：

```typescript
const result = routeRef.current(depsRef.current)
const newClient = result instanceof Promise ? await result : result

console.log('[useSSE] Client type:', typeof newClient)
console.log('[useSSE] Client constructor:', newClient?.constructor?.name)
console.log('[useSSE] Client has onStatusChange:', typeof newClient?.onStatusChange === 'function')
console.log('[useSSE] Client methods:', Object.keys(newClient || {}))

if (typeof newClient.onStatusChange !== 'function') {
  console.error('[useSSE] ERROR: Client does not have onStatusChange method!')
  console.error('[useSSE] Client:', newClient)
  throw new Error('Invalid SSE client: missing onStatusChange method')
}

newClient.onStatusChange((newStatus: 'connecting' | 'open' | 'closed') => {
  setStatus(newStatus)
})
```

#### 方案 2: 检查服务器端日志

查看服务器端的日志，确认：
1. 是否收到了 SSE 请求
2. 请求头是否包含 Authorization
3. Agent ID 是否有效
4. 为什么返回 400 错误

#### 方案 3: 验证认证流程

检查认证 token：
1. Token 是否存在（localStorage 中的 `auth-token`）
2. Token 格式是否正确
3. Token 是否过期
4. 服务器端是否正确验证 token

#### 方案 4: 检查 Agent ID

验证 agent ID `agent_62b4dc726db0`：
1. 该 agent 是否存在
2. 当前用户是否有权访问
3. 是否需要先创建 agent

## 推荐的调试步骤

### 第一步：添加调试日志

1. **在 apiClient.ts 中添加日志**：
   - 确认 `sse` 函数是否被调用
   - 检查 token 是否存在
   - 验证返回的客户端类型

2. **在 useSSE.ts 中添加日志**：
   - 打印 `newClient` 的类型和构造函数名
   - 检查是否有 `onStatusChange` 方法
   - 列出所有可用的方法

### 第二步：检查浏览器控制台

运行应用后，查看浏览器控制台输出：
- 如果看到 `[SSE] Creating SSE client for URL:` 日志，说明 `sse` 函数被调用
- 如果看到 `[useSSE] Client constructor: SSEClientImpl`，说明客户端创建成功
- 如果看到 `[useSSE] ERROR`，说明客户端类型不正确

### 第三步：检查网络请求

使用浏览器开发者工具的 Network 标签：
1. 找到 SSE 请求（`/api/agents/agent_62b4dc726db0/chat/stream`）
2. 检查请求头是否包含 `Authorization: Bearer <token>`
3. 查看响应状态码和内容
4. 如果是 400 错误，查看响应体中的错误信息

### 第四步：检查服务器端日志

查看服务器端的控制台输出：
- 是否收到 SSE 请求
- 认证是否通过
- Agent ID 是否有效
- 为什么返回 400 错误

### 第五步：验证修复

根据调试结果，采取相应的修复措施：
- 如果是认证问题，检查 token 生成和验证逻辑
- 如果是 Agent ID 问题，确保 agent 已创建
- 如果是客户端类型问题，检查 Hono 补丁是否正确应用

---

## 总结

**问题根源**：HTTP 400 Bad Request 导致 SSE 连接失败

**可能原因**：
1. 认证 token 无效或未正确传递
2. Agent ID 不存在或无权访问
3. 服务器端验证失败

**解决步骤**：
1. 添加调试日志，确认客户端创建和连接流程
2. 检查网络请求，确认认证和参数
3. 查看服务器端日志，确认错误原因
4. 根据错误原因修复相应问题

**注意**：项目已经应用了 Hono 补丁（4.12.7），支持自定义 SSE 客户端，所以类型问题不是主要原因。重点应该放在解决 HTTP 400 错误上。
