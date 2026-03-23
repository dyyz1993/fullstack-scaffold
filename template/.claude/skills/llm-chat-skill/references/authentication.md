# 用户认证实现指南

## 目录

1. [认证架构](#认证架构)
2. [服务端实现](#服务端实现)
3. [客户端实现](#客户端实现)
4. [Token 管理](#token-管理)
5. [多用户隔离](#多用户隔离)

---

## 认证架构

### 认证流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户      │     │   客户端     │     │   服务端     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. 选择账户登录   │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  2. POST /login   │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  3. 返回 token    │
       │                   │<──────────────────│
       │                   │                   │
       │                   │  4. 存储 token    │
       │                   │  到 localStorage  │
       │                   │                   │
       │                   │  5. 后续请求携带  │
       │                   │  Authorization    │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  6. 验证 token    │
       │                   │  返回用户数据      │
       │                   │<──────────────────│
       │                   │                   │
```

### 认证方式

| 环境     | 认证方式   | Token 格式                     |
| -------- | ---------- | ------------------------------ |
| 开发环境 | Mock Token | `user-a-token`, `user-b-token` |
| 生产环境 | JWT        | `eyJhbGciOiJIUzI1NiIs...`      |

---

## 服务端实现

### 1. 认证中间件

```typescript
// src/server/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { getCookie, getSignedCookie } from 'hono/cookie'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'user' | 'admin' | 'super_admin'
  avatar?: string
  permissions: string[]
}

export interface AuthMiddlewareOptions {
  required?: boolean
  roles?: string[]
}

export function authMiddleware(options: AuthMiddlewareOptions = {}) {
  return createMiddleware<{ Variables: { user: AuthUser } }>(async (c, next) => {
    const token = extractToken(c.req.header('Authorization'))

    if (!token) {
      if (options.required !== false) {
        return c.json({ success: false, error: 'Unauthorized' }, 401)
      }
      return next()
    }

    const user = await verifyToken(token)

    if (!user) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    if (options.roles && !options.roles.includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    c.set('user', user)
    await next()
  })
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim()
}

// 开发环境 Token 验证
function verifyDevToken(token: string): AuthUser | null {
  const devTokens: Record<string, AuthUser> = {
    'user-a-token': {
      id: 'user-a',
      username: '用户A',
      email: 'user-a@example.com',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-a',
      permissions: ['read', 'write'],
    },
    'user-b-token': {
      id: 'user-b',
      username: '用户B',
      email: 'user-b@example.com',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-b',
      permissions: ['read', 'write'],
    },
    'user-c-token': {
      id: 'user-c',
      username: '用户C',
      email: 'user-c@example.com',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-c',
      permissions: ['read', 'write'],
    },
  }

  return devTokens[token] || null
}

// 生产环境 JWT 验证
async function verifyJWTToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = await jwtVerify(token, JWT_SECRET)
    return payload.user
  } catch {
    return null
  }
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  if (process.env.NODE_ENV === 'development') {
    return verifyDevToken(token)
  }
  return verifyJWTToken(token)
}
```

### 2. 在路由中使用

```typescript
// src/server/app.ts
import { authMiddleware } from './middleware/auth'

export function createApp() {
  const app = new OpenAPIHono()
    // 全局中间件
    .use('*', errorHandlerMiddleware())
    .use('*', loggerMiddleware())
    .use('*', corsMiddleware())

    // API 路由（需要认证）
    .use('/api/*', authMiddleware({ required: true }))
    .route('/api', apiRoutes)

    // 健康检查（无需认证）
    .get('/health', async c => {
      return c.json({ status: 'ok' })
    })

  return app
}
```

### 3. 获取当前用户

```typescript
// src/server/module-agent/routes/agent-routes.ts
import { authMiddleware } from '@server/middleware/auth'

const getMessagesRoute = createRoute({
  method: 'get',
  path: '/agents/{id}/messages',
  middleware: [authMiddleware()], // 确保用户已认证
  // ...
}).openapi(getMessagesRoute, async c => {
  const user = c.get('user') // 获取当前用户
  const userId = user.id

  // 使用 userId 获取该用户的消息
  const messages = await agentService.getMessages(agentId, userId)

  return c.json(success({ messages, total: messages.length }))
})
```

---

## 客户端实现

### 1. Auth Store

```typescript
// src/client/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  username: string
  avatar?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, user: AuthUser) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-token', // localStorage key
    }
  )
)
```

### 2. 登录页面

```typescript
// src/client/pages/LoginPage.tsx
import { User } from 'lucide-react'
import { useAuthStore, type AuthUser } from '../stores/authStore'

interface TestAccount {
  id: string
  token: string
  username: string
  avatar: string
  color: string
}

const testAccounts: TestAccount[] = [
  {
    id: 'user-a',
    token: 'user-a-token',
    username: '用户 A',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-a',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'user-b',
    token: 'user-b-token',
    username: '用户 B',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-b',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'user-c',
    token: 'user-c-token',
    username: '用户 C',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-c',
    color: 'from-orange-500 to-red-500',
  },
]

export function LoginPage() {
  const login = useAuthStore((state) => state.login)

  const handleLogin = (account: TestAccount) => {
    const user: AuthUser = {
      id: account.id,
      username: account.username,
      avatar: account.avatar,
    }
    login(account.token, user)
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">欢迎回来</h1>
          <p className="text-text-secondary">选择一个账户开始聊天</p>
        </div>

        <div className="space-y-4">
          {testAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleLogin(account)}
              className="w-full p-4 bg-bg-secondary rounded-xl border border-border-default hover:border-accent-primary transition-all hover:shadow-lg group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${account.color} flex items-center justify-center overflow-hidden`}>
                  <img src={account.avatar} alt={account.username} className="w-full h-full" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                    {account.username}
                  </h3>
                  <p className="text-sm text-text-muted">点击登录</p>
                </div>
                <User className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 3. App.tsx 登录检查

```typescript
// src/client/App.tsx
import { useAuthStore } from './stores/authStore'
import { LoginPage } from './pages/LoginPage'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // 未登录时显示登录页面
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // 已登录时显示主界面
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* 主界面内容 */}
    </div>
  )
}
```

---

## Token 管理

### 1. 自动携带 Token

```typescript
// src/client/services/apiClient.ts
import { hc } from 'hono/client'

const TOKEN_KEY = 'auth-token'

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Zustand persist 格式
      if (typeof parsed === 'string') {
        return parsed
      }
      return parsed.state?.token || null
    }
    return null
  } catch {
    return null
  }
}

// 自定义 fetch，自动添加 Authorization header
const authenticatedFetch = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const token = getAuthToken()
  const headers = new Headers(init?.headers)

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return window.fetch(url, {
    ...init,
    headers,
  })
}

export const apiClient = hc<AppType>(baseUrl, {
  fetch: authenticatedFetch as typeof fetch,
})
```

### 2. Token 过期处理

```typescript
// 在 API 响应拦截器中处理
const authenticatedFetch = async (
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> => {
  const response = await window.fetch(url, {
    ...init,
    headers: addAuthHeader(init?.headers),
  })

  // Token 过期，跳转登录
  if (response.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
  }

  return response
}
```

---

## 多用户隔离

### 1. 数据隔离原则

```
用户 A → Agent A → Messages A → Workspace A
用户 B → Agent B → Messages B → Workspace B
用户 C → Agent C → Messages C → Workspace C
```

### 2. 服务端隔离实现

```typescript
// src/server/module-agent/services/agent-service.ts

// 每个用户创建独立的 Agent
function getOrCreateAgentForUser(userId: string): Agent {
  let agent = mockAgents.find(a => a.userId === userId)
  if (!agent) {
    agent = {
      id: `agent-${userId}`,
      userId,
      name: `Agent for ${userId}`,
      // ...
    }
    mockAgents.push(agent)
  }
  return agent
}

// 按用户加载历史消息
export async function getMessages(agentId: string, userId: string): Promise<ChatMessage[]> {
  // 优先从 PI 会话加载
  const piMessages = await loadMessagesFromPiSession(userId)
  if (piMessages.length > 0) {
    return piMessages
  }

  // fallback 到内存
  return mockMessages.filter(m => m.agentId === agentId)
}
```

### 3. Workspace 隔离

```typescript
// src/server/module-agent/services/workspace-manager.ts
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

class WorkspaceManager {
  private baseDir: string

  constructor() {
    this.baseDir = path.join(os.homedir(), '.pi-workspaces')
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
  }

  async getWorkspacePath(userId: string): Promise<string> {
    const workspacePath = path.join(this.baseDir, `user-${userId}`)

    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true })
      // 初始化 workspace
      await this.initWorkspace(workspacePath)
    }

    return workspacePath
  }

  private async initWorkspace(workspacePath: string): Promise<void> {
    // 创建 .pi 目录
    const piDir = path.join(workspacePath, '.pi')
    fs.mkdirSync(piDir, { recursive: true })

    // 创建默认配置
    const config = {
      agent: {
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: 'You are a helpful assistant.',
      },
    }
    fs.writeFileSync(path.join(piDir, 'config.json'), JSON.stringify(config, null, 2))
  }
}

export const workspaceManager = new WorkspaceManager()
```

---

## 完整示例

### 登录流程完整代码

```typescript
// 1. 用户点击登录按钮
const handleLogin = (account: TestAccount) => {
  const user: AuthUser = {
    id: account.id,
    username: account.username,
    avatar: account.avatar,
  }
  login(account.token, user) // 存储到 Zustand + localStorage
}

// 2. App.tsx 检测登录状态
if (!isAuthenticated) {
  return <LoginPage />
}

// 3. 后续 API 请求自动携带 token
const response = await apiClient.api.agents.$get()
// 请求头: Authorization: Bearer user-a-token

// 4. 服务端验证 token 并获取用户
const user = c.get('user') // { id: 'user-a', ... }

// 5. 使用 userId 隔离数据
const messages = await getMessages(agentId, user.id)
```
