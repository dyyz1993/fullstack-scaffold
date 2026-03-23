# Mock LLM 实现指南

## 目录

1. [Mock 概述](#mock-概述)
2. [Mock PI Session 实现](#mock-pi-session-实现)
3. [模拟响应模式](#模拟响应模式)
4. [环境切换](#环境切换)

---

## Mock 概述

### 为什么需要 Mock LLM

| 场景      | Mock 优势                  |
| --------- | -------------------------- |
| 开发调试  | 无需真实 API Key，节省成本 |
| 单元测试  | 可预测的响应，便于断言     |
| CI/CD     | 不依赖外部服务，稳定可靠   |
| 演示 Demo | 可定制响应内容             |

### Mock 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Service                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Session Manager                            │
│  createSession(agentId, userId)                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  MockSession │ │  RealSession │ │  PI Session  │
    │  (开发环境)   │ │  (生产环境)   │ │  (PI 集成)   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Mock PI Session 实现

### 完整实现

```typescript
// src/server/module-agent/services/mock-pi-session.ts
import type {
  PiSession,
  PiSessionConfig,
  PiMessage,
  PiToolCall,
} from '@mariozechner/pi-coding-agent'
import { EventEmitter } from 'events'

export class MockPiSession extends EventEmitter implements PiSession {
  private config: PiSessionConfig
  private messageCount = 0

  constructor(config: PiSessionConfig) {
    super()
    this.config = config
  }

  async sendMessage(
    content: string,
    callbacks: {
      onTextDelta?: (delta: string, isFinal: boolean) => void
      onThinkingDelta?: (delta: string) => void
      onToolStart?: (toolCall: { id: string; name: string; args: Record<string, unknown> }) => void
      onToolEnd?: (toolCall: { id: string; result: unknown; error?: string }) => void
      onComplete?: (fullContent: string) => void
      onError?: (error: Error) => void
    }
  ): Promise<void> {
    const messageId = `mock-msg-${++this.messageCount}`

    // 模拟延迟
    await this.delay(100)

    // 根据用户输入选择响应模式
    const response = this.selectResponse(content)

    // 发送 Agent 开始事件
    this.emit('agent-start', { messageId })

    try {
      // 如果有思考过程
      if (response.thinking) {
        await this.streamThinking(response.thinking, callbacks.onThinkingDelta)
      }

      // 如果有工具调用
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          await this.executeToolCall(toolCall, callbacks)
        }
      }

      // 流式输出文本
      if (response.text) {
        await this.streamText(response.text, callbacks.onTextDelta)
      }

      // 完成
      callbacks.onComplete?.(response.text || '')
      this.emit('agent-end', { messageId })
    } catch (error) {
      callbacks.onError?.(error as Error)
    }
  }

  private selectResponse(content: string): MockResponse {
    const lowerContent = content.toLowerCase()

    // 根据关键词选择响应
    if (lowerContent.includes('hello') || lowerContent.includes('你好')) {
      return {
        text: '你好！我是 AI 助手，有什么可以帮助你的吗？',
      }
    }

    if (lowerContent.includes('时间') || lowerContent.includes('time')) {
      return {
        thinking: '用户想知道当前时间，我需要获取系统时间。',
        text: `现在是 ${new Date().toLocaleString('zh-CN')}`,
      }
    }

    if (lowerContent.includes('文件') || lowerContent.includes('file')) {
      return {
        thinking: '用户想操作文件，我需要使用文件工具。',
        toolCalls: [
          {
            id: `tool-${Date.now()}`,
            name: 'read_file',
            args: { path: 'src/index.ts' },
            result:
              '// 这是一个示例文件内容\nexport function main() {\n  console.log("Hello World")\n}',
          },
        ],
        text: '我已经读取了文件内容，如上所示。',
      }
    }

    if (lowerContent.includes('测试宽度') || lowerContent.includes('testwidth')) {
      return {
        text: '这是一段很长的测试文本，用于验证消息卡片的宽度是否正确显示。'.repeat(3),
      }
    }

    // 默认响应
    return {
      thinking: '用户发送了一条消息，我需要理解并回复。',
      text: `我收到了你的消息："${content}"。这是一个 Mock 响应，用于测试目的。`,
    }
  }

  private async streamText(
    text: string,
    onDelta?: (delta: string, isFinal: boolean) => void
  ): Promise<void> {
    const words = text.split('')

    for (let i = 0; i < words.length; i++) {
      await this.delay(30) // 模拟打字速度
      onDelta?.(words[i], i === words.length - 1)
    }
  }

  private async streamThinking(thinking: string, onDelta?: (delta: string) => void): Promise<void> {
    const words = thinking.split('')

    for (const word of words) {
      await this.delay(10)
      onDelta?.(word)
    }
  }

  private async executeToolCall(
    toolCall: MockToolCall,
    callbacks: {
      onToolStart?: (toolCall: { id: string; name: string; args: Record<string, unknown> }) => void
      onToolEnd?: (toolCall: { id: string; result: unknown; error?: string }) => void
    }
  ): Promise<void> {
    callbacks.onToolStart?.({
      id: toolCall.id,
      name: toolCall.name,
      args: toolCall.args,
    })

    await this.delay(500) // 模拟工具执行时间

    callbacks.onToolEnd?.({
      id: toolCall.id,
      result: toolCall.result,
      error: toolCall.error,
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getHistory(): Promise<PiMessage[]> {
    return []
  }

  async clearHistory(): Promise<void> {
    // Mock 实现：清空历史
  }
}

interface MockResponse {
  text?: string
  thinking?: string
  toolCalls?: MockToolCall[]
}

interface MockToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: unknown
  error?: string
}
```

---

## 模拟响应模式

### 响应模式配置

```typescript
// src/server/module-agent/services/mock-responses.ts

export const mockResponses = {
  // 简单问候
  greeting: {
    patterns: ['hello', 'hi', '你好', '您好'],
    response: {
      text: '你好！我是 AI 助手，有什么可以帮助你的吗？',
    },
  },

  // 带思考的响应
  thinking: {
    patterns: ['为什么', '怎么', '如何', 'why', 'how'],
    response: {
      thinking: '这是一个需要深入思考的问题，让我分析一下...',
      text: '这是一个很好的问题！让我来详细解答...',
    },
  },

  // 带工具调用的响应
  toolUse: {
    patterns: ['读取文件', 'read file', '查看代码', 'read code'],
    response: {
      thinking: '用户想要读取文件，我需要使用文件读取工具。',
      toolCalls: [
        {
          name: 'read_file',
          args: { path: 'src/index.ts' },
          result: '// 示例代码\nexport function main() {\n  return "Hello"\n}',
        },
      ],
      text: '我已经读取了文件内容。',
    },
  },

  // 长文本响应
  longText: {
    patterns: ['长文本', 'long text', '测试宽度'],
    response: {
      text: '这是一段很长的测试文本...'.repeat(10),
    },
  },

  // 错误响应
  error: {
    patterns: ['错误', 'error', '失败'],
    response: {
      thinking: '模拟一个错误场景...',
      toolCalls: [
        {
          name: 'risky_operation',
          args: {},
          error: '操作失败：模拟的错误信息',
        },
      ],
      text: '抱歉，操作遇到了问题。',
    },
  },
}

export function findMatchingResponse(content: string): MockResponse | null {
  const lowerContent = content.toLowerCase()

  for (const [, config] of Object.entries(mockResponses)) {
    if (config.patterns.some(p => lowerContent.includes(p))) {
      return config.response
    }
  }

  return null
}
```

---

## 环境切换

### 配置管理

```typescript
// src/server/config/llm-config.ts

export interface LLMConfig {
  useMock: boolean
  mockDelay: number
  apiKey?: string
  model: string
}

export function getLLMConfig(): LLMConfig {
  return {
    useMock: process.env.USE_MOCK_LLM === 'true',
    mockDelay: parseInt(process.env.MOCK_DELAY || '30', 10),
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
  }
}
```

### Session 工厂

```typescript
// src/server/module-agent/services/session-factory.ts
import { MockPiSession } from './mock-pi-session'
import { createAgentSession } from '@mariozechner/pi-coding-agent'
import { getLLMConfig } from '@server/config/llm-config'

export async function createSession(
  agentId: string,
  userId: string,
  workspacePath: string
): Promise<PiSession> {
  const config = getLLMConfig()

  if (config.useMock) {
    return new MockPiSession({
      agentId,
      userId,
      workspacePath,
      delay: config.mockDelay,
    })
  }

  return createAgentSession({
    agentId,
    userId,
    workspacePath,
    model: config.model,
    apiKey: config.apiKey,
  })
}
```

### .env 配置

```bash
# .env.development
USE_MOCK_LLM=true
MOCK_DELAY=30

# .env.production
USE_MOCK_LLM=false
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-sonnet-20241022
```

---

## 测试用例

### 单元测试

```typescript
// src/server/module-agent/services/__tests__/mock-pi-session.test.ts
import { describe, it, expect, vi } from 'vitest'
import { MockPiSession } from '../mock-pi-session'

describe('MockPiSession', () => {
  it('should return greeting for hello', async () => {
    const session = new MockPiSession({ agentId: 'test', userId: 'user-1' })

    const textChunks: string[] = []
    await session.sendMessage('hello', {
      onTextDelta: delta => textChunks.push(delta),
    })

    expect(textChunks.join('')).toContain('你好')
  })

  it('should stream text with delay', async () => {
    const session = new MockPiSession({ agentId: 'test', userId: 'user-1' })

    const startTime = Date.now()
    await session.sendMessage('hello', {
      onTextDelta: () => {},
    })
    const duration = Date.now() - startTime

    // 应该有延迟
    expect(duration).toBeGreaterThan(100)
  })

  it('should handle tool calls', async () => {
    const session = new MockPiSession({ agentId: 'test', userId: 'user-1' })

    const toolStarts: Array<{ name: string }> = []
    const toolEnds: Array<{ result: unknown }> = []

    await session.sendMessage('读取文件', {
      onToolStart: tool => toolStarts.push(tool),
      onToolEnd: tool => toolEnds.push(tool),
    })

    expect(toolStarts).toHaveLength(1)
    expect(toolStarts[0].name).toBe('read_file')
    expect(toolEnds[0].result).toBeDefined()
  })
})
```
