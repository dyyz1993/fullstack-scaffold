# 样式系统实现指南

## 目录

1. [设计系统](#设计系统)
2. [消息卡片样式](#消息卡片样式)
3. [打字机效果](#打字机效果)
4. [工具调用卡片](#工具调用卡片)
5. [动画系统](#动画系统)

---

## 设计系统

### Tailwind 配置

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f0f0f',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#252525',
        'bg-hover': '#2a2a2a',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'text-muted': '#666666',
        'border-default': '#333333',
        'border-hover': '#444444',
        'accent-primary': '#3b82f6',
        'accent-secondary': '#8b5cf6',
        'accent-success': '#22c55e',
        'accent-warning': '#f59e0b',
        'accent-danger': '#ef4444',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        typewriter: 'typewriter 0.1s steps(1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        typewriter: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## 消息卡片样式

### 基础消息卡片

```typescript
// src/client/components/MessageCard.tsx
import { cn } from '@client/utils/cn'
import type { ChatMessage } from '@client/types'

interface MessageCardProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function MessageCard({ message, isStreaming }: MessageCardProps) {
  const isUser = message.type === 'user'

  return (
    <div className={cn('flex w-full mb-4 animate-fade-in', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        isUser
          ? 'bg-accent-primary text-white rounded-br-md'
          : 'bg-bg-secondary text-text-primary rounded-bl-md border border-border-default'
      )}>
        {message.thinking && <ThinkingBlock content={message.thinking} />}

        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-text-primary animate-typewriter" />
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.toolCalls.map((tool) => (
              <ToolCallCard key={tool.toolCallId} toolCall={tool} />
            ))}
          </div>
        )}

        <div className={cn('text-xs mt-2', isUser ? 'text-white/60' : 'text-text-muted')}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}
```

### 思考过程块

```typescript
// src/client/components/ThinkingBlock.tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface ThinkingBlockProps {
  content: string
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-3 p-3 bg-bg-tertiary rounded-lg border border-border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <Brain className="w-4 h-4 text-accent-secondary" />
        <span>思考过程</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-2 text-sm text-text-muted whitespace-pre-wrap animate-fade-in">
          {content}
        </div>
      )}
    </div>
  )
}
```

---

## 打字机效果

### 流式打字机（推荐）

```typescript
// 流式场景下，直接显示增量文本，无需逐字动画
// 因为 SSE 已经是增量发送，本身就是"打字机"效果

interface StreamingTextProps {
  content: string
  isStreaming: boolean
}

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  return (
    <span>
      {content}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-text-primary animate-pulse" />
      )}
    </span>
  )
}
```

---

## 工具调用卡片

```typescript
// src/client/components/ToolCallCard.tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Wrench } from 'lucide-react'
import type { ToolCall } from '@shared/modules/agent'

interface ToolCallCardProps {
  toolCall: ToolCall
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    pending: <Loader2 className="w-4 h-4 text-text-muted animate-spin" />,
    running: <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />,
    completed: <CheckCircle className="w-4 h-4 text-accent-success" />,
    error: <XCircle className="w-4 h-4 text-accent-danger" />,
  }[toolCall.status]

  return (
    <div className="bg-bg-tertiary rounded-lg border border-border-default overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-bg-hover transition-colors"
      >
        <Wrench className="w-4 h-4 text-accent-primary" />
        <span className="flex-1 text-left text-sm font-medium text-text-primary">
          {toolCall.toolName}
        </span>
        {statusIcon}
        {expanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border-default animate-fade-in">
          {toolCall.args && Object.keys(toolCall.args).length > 0 && (
            <div className="p-3 border-b border-border-default">
              <div className="text-xs text-text-muted mb-2">参数</div>
              <pre className="text-sm text-text-secondary overflow-x-auto">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.result !== undefined && (
            <div className="p-3">
              <div className="text-xs text-text-muted mb-2">结果</div>
              <pre className="text-sm text-text-secondary overflow-x-auto max-h-48">
                {typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.error && (
            <div className="p-3 bg-accent-danger/10">
              <div className="text-xs text-accent-danger mb-2">错误</div>
              <pre className="text-sm text-accent-danger overflow-x-auto">{toolCall.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 动画系统

### 滚动到底部

```typescript
// src/client/hooks/useScrollToBottom.ts
import { useEffect, useRef } from 'react'

export function useScrollToBottom(dependency: unknown) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [dependency])

  return containerRef
}
```

### 加载状态

```typescript
// src/client/components/LoadingIndicator.tsx
import { Loader2 } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-text-muted">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">正在思考...</span>
    </div>
  )
}
```
