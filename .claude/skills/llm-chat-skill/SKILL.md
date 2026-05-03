---
name: llm-chat
description: |
  构建 LLM 聊天应用的完整解决方案，支持 Mock/真实 LLM 切换、
  流式输出、打字机效果、消息卡片样式、历史恢复。

  触发场景：
  - 创建 LLM 聊天应用或聊天界面
  - 实现流式消息输出（SSE/WebSocket）
  - 添加聊天历史恢复功能
  - 设计消息卡片样式和打字机效果
  - 集成 PI Agent 会话或类似 AI Agent
  - 实现用户登录和多用户消息隔离
---

# LLM Chat Skill

构建生产级 LLM 聊天应用的完整指南，涵盖前后端架构、流式通信、历史恢复等核心功能。

## 目录

1. [架构概览](#架构概览)
2. [核心功能模块](#核心功能模块)
3. [项目结构](#项目结构)
4. [快速开始](#快速开始)
5. [详细实现](#详细实现)

---

## 架构概览

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (React + TypeScript)                    │
├──────────────┬──────────────┬──────────────┬─────────────┬──────────────┤
│   ChatArea   │  MessageCard │ ToolCallCard │  LoginPanel │ SSE Hook     │
│   聊天区域    │   消息卡片    │  工具调用卡片 │   登录面板   │ 流式连接     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┴──────┬───────┘
       │              │              │              │             │
       ▼              ▼              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Zustand Store (状态管理)                          │
├─────────────────────────────────┬───────────────────────────────────────┤
│          agentStore             │              authStore                 │
│  - messages: ChatMessage[]      │  - user: AuthUser | null              │
│  - agent: Agent | null          │  - token: string | null               │
│  - sendMessage()                │  - login(token, user)                 │
│  - fetchMessages()              │  - logout()                           │
│  - updateMessageContent()       │  - isAuthenticated: boolean           │
└─────────────────────────────────┴───────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API Client (Hono RPC)                               │
│  类型安全的 API 调用，自动携带 Authorization header                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Server (Hono + TypeScript)                        │
├──────────────┬──────────────┬──────────────┬─────────────┬──────────────┤
│    Routes    │   Services   │  PI Session  │  History    │  Middleware  │
│    路由层     │    服务层     │   会话管理    │  历史加载    │   中间件     │
└──────────────┴──────────────┴──────────────┴─────────────┴──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────────┐
              │  Mock    │   │  Real    │   │  PI Session  │
              │  LLM     │   │  LLM     │   │  Files       │
              │  (测试)   │   │  (生产)   │   │  ~/.pi/...   │
              └──────────┘   └──────────┘   └──────────────┘
```

### 数据流

```
用户输入 → sendMessage() → POST /api/agents/:id/chat
                                    ↓
                            创建/获取 PI Session
                                    ↓
                            SSE 流式返回事件
                                    ↓
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              pi-text-delta   pi-tool-start   pi-agent-end
                    ↓               ↓               ↓
              更新消息内容     显示工具调用    标记流式结束
```

---

## 核心功能模块

### 模块清单

| 模块     | 功能                  | 文件                                |
| -------- | --------------------- | ----------------------------------- |
| 用户认证 | 登录/登出、Token 管理 | `authStore.ts`, `auth.ts`           |
| 消息管理 | 发送/接收/更新消息    | `agentStore.ts`, `agent-service.ts` |
| 流式通信 | SSE 连接、事件处理    | `useChatSSEConnection.ts`           |
| 历史恢复 | 从 PI 会话加载历史    | `agent-service.ts`                  |
| 消息渲染 | 卡片样式、打字机效果  | `MessageCard.tsx`, `ChatArea.tsx`   |
| Mock LLM | 测试环境模拟          | `mock-pi-session.ts`                |

### 功能开关

```typescript
// .env
USE_MOCK_LLM = true // 使用 Mock LLM
USE_MOCK_LLM = false // 使用真实 LLM
```

---

## 项目结构

```
src/
├── client/                          # 前端代码
│   ├── components/
│   │   ├── ChatArea.tsx             # 聊天区域主组件
│   │   ├── MessageCard.tsx          # 消息卡片
│   │   ├── ToolCallCard.tsx         # 工具调用卡片
│   │   └── TypewriterText.tsx       # 打字机效果组件
│   ├── hooks/
│   │   └── useChatSSEConnection.ts  # SSE 连接 Hook
│   ├── stores/
│   │   ├── agentStore.ts            # Agent 状态管理
│   │   └── authStore.ts             # 认证状态管理
│   ├── services/
│   │   └── apiClient.ts             # API 客户端
│   ├── pages/
│   │   └── LoginPage.tsx            # 登录页面
│   ├── types.ts                     # 类型定义
│   └── App.tsx                      # 应用入口
│
├── server/                          # 后端代码
│   ├── module-agent/
│   │   ├── routes/
│   │   │   └── agent-routes.ts      # Agent 路由
│   │   └── services/
│   │       ├── agent-service.ts     # Agent 服务
│   │       ├── mock-pi-session.ts   # Mock PI 会话
│   │       └── workspace-manager.ts # Workspace 管理
│   ├── middleware/
│   │   └── auth.ts                  # 认证中间件
│   └── app.ts                       # 应用入口
│
└── shared/                          # 共享代码
    └── modules/
        ├── agent/
        │   ├── schemas.ts           # Agent Schema
        │   └── index.ts             # 导出
        └── chat/
            └── index.ts             # Chat SSE 协议
```

---

## 快速开始

### 1. 初始化项目

运行初始化脚本创建项目结构：

```bash
# 使用 Node.js 版本
npx ts-node scripts/init-chat-project.ts --name my-chat-app

# 或使用 Python 版本
python scripts/init-chat-project.py --name my-chat-app
```

### 2. 安装依赖

```bash
npm install hono @hono/zod-openapi zustand zod
npm install -D typescript @types/node
```

### 3. 配置环境变量

```bash
# .env
USE_MOCK_LLM=true
API_BASE_URL=http://localhost:3010
```

### 4. 启动开发服务器

```bash
npm run dev
```

---

## 详细实现

### 1. 用户认证

详见 [references/authentication.md](references/authentication.md)

### 2. 消息管理

详见 [references/message-management.md](references/message-management.md)

### 3. 流式通信 (SSE)

详见 [references/sse-protocol.md](references/sse-protocol.md)

### 4. 历史消息恢复

详见 [references/message-history.md](references/message-history.md)

### 5. 消息样式系统

详见 [references/styling-patterns.md](references/styling-patterns.md)

### 6. Mock LLM 实现

详见 [references/mock-llm.md](references/mock-llm.md)

---

## 组件模板

### ChatArea 组件

见 [assets/chat-components/ChatArea.tsx](assets/chat-components/ChatArea.tsx)

### MessageCard 组件

见 [assets/chat-components/MessageCard.tsx](assets/chat-components/MessageCard.tsx)

### Store 模板

见 [assets/stores/](assets/stores/)

---

## 最佳实践

### 1. 消息隔离

每个用户应该有独立的 agent 和消息历史：

```typescript
// 服务端：按 userId 创建/获取 agent
const agent = await getOrCreateAgentForUser(userId)

// 服务端：按 userId 加载历史消息
const messages = await loadMessagesFromPiSession(userId)
```

### 2. Token 管理

使用 Zustand persist 自动持久化 token：

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      // ...
    }),
    { name: 'auth-token' }
  )
)
```

### 3. 流式消息更新

使用增量更新而非替换：

```typescript
// 正确：增量更新
updateMessageContent(messageId, prev => prev + delta)

// 错误：替换整个消息
set({ messages: [...messages, { ...msg, content: delta }] })
```

### 4. 错误处理

```typescript
try {
  const response = await apiClient.api.agents[':id'].chat.$post({...})
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error)
  }
} catch (error) {
  setError(error instanceof Error ? error.message : 'Unknown error')
}
```

---

## 故障排查

### 问题：刷新后消息丢失

**原因**：消息存储在内存中，服务重启后丢失

**解决方案**：从 PI 会话文件恢复历史

```typescript
// agent-service.ts
export async function getMessages(agentId: string, userId: string) {
  const piMessages = await loadMessagesFromPiSession(userId)
  if (piMessages.length > 0) {
    return piMessages
  }
  // fallback to memory
  return mockMessages.filter(m => m.agentId === agentId)
}
```

### 问题：SSE 连接断开

**原因**：网络问题或服务重启

**解决方案**：实现自动重连

```typescript
// useChatSSEConnection.ts
useEffect(() => {
  const client = chatSSE.getClient()

  client.on('error', () => {
    setTimeout(() => {
      chatSSE.reconnect()
    }, 3000)
  })
}, [])
```

### 问题：类型推导丢失

**原因**：Hono 链式语法中断

**解决方案**：始终使用链式语法

```typescript
// 正确
export const apiRoutes = new OpenAPIHono().openapi(route1, handler1).openapi(route2, handler2)

// 错误
const app = new OpenAPIHono()
app.openapi(route1, handler1) // 类型丢失
```

---

## 相关资源

- [Hono RPC 文档](https://hono.dev/docs/guides/rpc)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Server-Sent Events 规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [PI Coding Agent](https://github.com/MarioZechner/pi-coding-agent)
