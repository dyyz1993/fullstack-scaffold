# 历史消息恢复实现指南

## 目录

1. [PI 会话文件结构](#pi-会话文件结构)
2. [服务端实现](#服务端实现)
3. [客户端实现](#客户端实现)
4. [最佳实践](#最佳实践)

---

## PI 会话文件结构

### 存储位置

```
~/.pi/agent/sessions/
├── 2024-01-15T10-30-00--Users-xuyingzhou-pi-workspaces-user-user-a.jsonl
├── 2024-01-15T11-00-00--Users-xuyingzhou-pi-workspaces-user-user-b.jsonl
└── 2024-01-15T14-00-00--Users-xuyingzhou-pi-workspaces-user-user-a.jsonl
```

### 文件命名规则

```
{timestamp}--{workspace-path-hash}.jsonl

示例：
2024-01-15T10-30-00--Users-xuyingzhou-pi-workspaces-user-user-a.jsonl
│                      │
│                      └── workspace 路径（/ 替换为 -）
└── ISO 时间戳
```

### JSONL 格式

每行一个 JSON 对象，记录会话中的事件：

```jsonl
{"type":"message","id":"msg-001","timestamp":"2024-01-15T10:30:05.000Z","message":{"role":"user","content":"Hello, how are you?"}}
{"type":"message","id":"msg-002","timestamp":"2024-01-15T10:30:10.000Z","message":{"role":"assistant","content":[{"type":"text","text":"I'm doing well, thank you!"}]}}
{"type":"message","id":"msg-003","timestamp":"2024-01-15T10:30:15.000Z","message":{"role":"user","content":"What can you do?"}}
{"type":"message","id":"msg-004","timestamp":"2024-01-15T10:30:20.000Z","message":{"role":"assistant","content":[{"type":"thinking","thinking":"Let me think..."},{"type":"text","text":"I can help you with..."}]}}
{"type":"tool_call","id":"tool-001","timestamp":"2024-01-15T10:30:25.000Z","toolCall":{"id":"call-001","name":"read_file","args":{"path":"src/index.ts"},"result":"..."}}
{"type":"session_end","timestamp":"2024-01-15T10:35:00.000Z"}
```

### 消息内容格式

#### 用户消息

```json
{
  "type": "message",
  "id": "msg-001",
  "timestamp": "2024-01-15T10:30:05.000Z",
  "message": {
    "role": "user",
    "content": "Hello, how are you?"
  }
}
```

#### 助手消息（纯文本）

```json
{
  "type": "message",
  "id": "msg-002",
  "timestamp": "2024-01-15T10:30:10.000Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "I'm doing well, thank you!"
      }
    ]
  }
}
```

#### 助手消息（带思考）

```json
{
  "type": "message",
  "id": "msg-003",
  "timestamp": "2024-01-15T10:30:15.000Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "thinking",
        "thinking": "The user is asking about my capabilities..."
      },
      {
        "type": "text",
        "text": "I can help you with many things!"
      }
    ]
  }
}
```

#### 助手消息（带工具调用）

```json
{
  "type": "message",
  "id": "msg-004",
  "timestamp": "2024-01-15T10:30:20.000Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Let me check that file for you."
      },
      {
        "type": "toolCall",
        "id": "call-001",
        "name": "read_file",
        "args": { "path": "src/index.ts" }
      }
    ]
  }
}
```

---

## 服务端实现

### 1. 加载历史消息

```typescript
// src/server/module-agent/services/agent-service.ts
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import type { ChatMessage, ToolCall } from '@shared/modules/agent'
import { workspaceManager } from './workspace-manager'

export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  // 优先从 PI 会话加载
  const piMessages = await loadMessagesFromPiSession(userId)
  if (piMessages.length > 0) {
    const start = offset || 0
    const end = limit ? start + limit : undefined
    return piMessages.slice(start, end)
  }

  // fallback 到内存
  const messages = mockMessages.filter(m => m.agentId === agentId)
  const start = offset || 0
  const end = limit ? start + limit : undefined
  return messages.slice(start, end)
}

async function loadMessagesFromPiSession(userId: string): Promise<ChatMessage[]> {
  try {
    // 1. 获取用户 workspace 路径
    const workspacePath = await workspaceManager.getWorkspacePath(userId)

    // 2. 构建 PI 会话目录路径
    const piSessionDir = path.join(os.homedir(), '.pi', 'agent', 'sessions')

    if (!fs.existsSync(piSessionDir)) {
      return []
    }

    // 3. 构建会话文件前缀（基于 workspace 路径）
    const workspaceSessionPrefix = workspacePath.replace(/\//g, '-').replace(/^-/, '')

    // 4. 查找所有匹配的会话文件
    const sessionFiles = fs
      .readdirSync(piSessionDir)
      .filter(f => f.endsWith('.jsonl') && f.includes(workspaceSessionPrefix))
      .map(f => ({
        name: f,
        path: path.join(piSessionDir, f),
        mtime: fs.statSync(path.join(piSessionDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime) // 按修改时间降序

    if (sessionFiles.length === 0) {
      return []
    }

    // 5. 读取最新的会话文件
    const latestSessionFile = sessionFiles[0].path
    const content = fs.readFileSync(latestSessionFile, 'utf-8')
    const lines = content.trim().split('\n')

    // 6. 解析消息
    const messages: ChatMessage[] = []
    let messageIndex = 0

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const entry = JSON.parse(line)

        if (entry.type === 'message' && entry.message) {
          const msg = entry.message
          const chatMessage = parseMessageEntry(
            entry.id || `pi-msg-${messageIndex++}`,
            msg,
            `agent-${userId}`
          )
          if (chatMessage) {
            messages.push(chatMessage)
          }
        }
      } catch {
        // Skip invalid lines
      }
    }

    return messages
  } catch (error) {
    console.error('Failed to load messages from PI session:', error)
    return []
  }
}

function parseMessageEntry(
  id: string,
  msg: { role: string; content: unknown },
  agentId: string
): ChatMessage | null {
  let content = ''
  let thinking: string | null = null
  const toolCalls: ToolCall[] = []

  if (msg.role === 'user') {
    // 用户消息
    if (typeof msg.content === 'string') {
      content = msg.content
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content as Array<{ type: string; text?: string }>) {
        if (block.type === 'text' && block.text) {
          content += block.text
        }
      }
    }
  } else if (msg.role === 'assistant') {
    // 助手消息
    if (typeof msg.content === 'string') {
      content = msg.content
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content as Array<{
        type: string
        text?: string
        thinking?: string
        id?: string
        name?: string
        args?: Record<string, unknown>
      }>) {
        if (block.type === 'text' && block.text) {
          content += block.text
        } else if (block.type === 'thinking' && block.thinking) {
          thinking = (thinking || '') + block.thinking
        } else if (block.type === 'toolCall' && block.id && block.name) {
          toolCalls.push({
            toolCallId: block.id,
            toolName: block.name,
            status: 'completed',
            args: block.args,
            result: null,
          })
        }
      }
    }
  }

  if (!content && !thinking && toolCalls.length === 0) {
    return null
  }

  return {
    id,
    agentId,
    role: msg.role === 'user' ? 'user' : 'agent',
    content,
    thinking,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    createdAt: new Date().toISOString(),
  }
}
```

### 2. Workspace 管理

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

  async listUserWorkspaces(): Promise<string[]> {
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory() && e.name.startsWith('user-'))
      .map(e => e.name.replace('user-', ''))
  }
}

export const workspaceManager = new WorkspaceManager()
```

---

## 客户端实现

### 1. 自动加载历史

```typescript
// src/client/App.tsx
import { useEffect } from 'react'
import { useAgentStore } from './stores/agentStore'
import { useAuthStore } from './stores/authStore'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const agent = useAgentStore((state) => state.agent)
  const fetchAgent = useAgentStore((state) => state.fetchAgent)
  const fetchMessages = useAgentStore((state) => state.fetchMessages)

  // 登录后获取 Agent
  useEffect(() => {
    if (isAuthenticated) {
      fetchAgent()
    }
  }, [isAuthenticated, fetchAgent])

  // Agent 加载后获取历史消息
  useEffect(() => {
    if (agent) {
      fetchMessages()
    }
  }, [agent, fetchMessages])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <ChatInterface />
}
```

### 2. 分页加载

```typescript
// src/client/stores/agentStore.ts
interface AgentState {
  // ...
  hasMore: boolean
  page: number
  pageSize: number

  loadMoreMessages: () => Promise<void>
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // ...
  hasMore: true,
  page: 0,
  pageSize: 20,

  loadMoreMessages: async () => {
    const { agent, page, pageSize, hasMore, loading } = get()
    if (!agent || loading || !hasMore) return

    set({ loading: true })

    try {
      const userId = getCurrentUserId()
      const offset = (page + 1) * pageSize
      const response = await apiClient.api.agents[':id'].messages.$get({
        param: { id: agent.id },
        query: {
          userId,
          limit: pageSize.toString(),
          offset: offset.toString(),
        },
      })

      const result = await response.json()
      if (result.success) {
        const newMessages = result.data.messages.map(transformMessage)
        set(state => ({
          messages: [...newMessages, ...state.messages], // 新消息在前面
          page: page + 1,
          hasMore: newMessages.length === pageSize,
          loading: false,
        }))
      }
    } catch (error) {
      set({ loading: false })
    }
  },
}))
```

---

## 最佳实践

### 1. 消息去重

```typescript
// 避免重复加载
function mergeMessages(existing: ChatMessage[], newMessages: ChatMessage[]): ChatMessage[] {
  const existingIds = new Set(existing.map(m => m.id))
  const unique = newMessages.filter(m => !existingIds.has(m.id))
  return [...unique, ...existing]
}
```

### 2. 增量更新

```typescript
// 只更新变化的消息
function updateMessages(
  existing: ChatMessage[],
  updates: Map<string, Partial<ChatMessage>>
): ChatMessage[] {
  return existing.map(msg => {
    const update = updates.get(msg.id)
    return update ? { ...msg, ...update } : msg
  })
}
```

### 3. 缓存策略

```typescript
// 使用 React Query 或 SWR 进行缓存
import { useQuery } from '@tanstack/react-query'

function useMessages(agentId: string, userId: string) {
  return useQuery({
    queryKey: ['messages', agentId, userId],
    queryFn: () => fetchMessages(agentId, userId),
    staleTime: 1000 * 60 * 5, // 5 分钟
    gcTime: 1000 * 60 * 30, // 30 分钟
  })
}
```

### 4. 错误恢复

```typescript
// 加载失败时使用缓存
async function getMessagesWithFallback(agentId: string, userId: string): Promise<ChatMessage[]> {
  try {
    return await loadMessagesFromPiSession(userId)
  } catch (error) {
    console.error('Failed to load from PI session:', error)
    // 尝试从本地存储加载
    const cached = localStorage.getItem(`messages-${userId}`)
    if (cached) {
      return JSON.parse(cached)
    }
    return []
  }
}
```
