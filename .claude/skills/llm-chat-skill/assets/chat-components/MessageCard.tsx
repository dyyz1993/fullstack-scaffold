import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Brain,
  CheckCircle,
  XCircle,
  Loader2,
  Wrench,
} from 'lucide-react'
import type { ChatMessage, ToolCall } from '@shared/modules/agent'

interface MessageCardProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function MessageCard({ message, isStreaming }: MessageCardProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full mb-4 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent-primary text-white rounded-br-md'
            : 'bg-bg-secondary text-text-primary rounded-bl-md border border-border-default'
        }`}
      >
        {/* 思考过程 */}
        {message.thinking && <ThinkingBlock content={message.thinking} />}

        {/* 消息内容 */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-text-primary animate-pulse" />
          )}
        </div>

        {/* 工具调用 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.toolCalls.map(tool => (
              <ToolCallCard key={tool.toolCallId} toolCall={tool} />
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <div className={`text-xs mt-2 ${isUser ? 'text-white/60' : 'text-text-muted'}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}

function ThinkingBlock({ content }: { content: string }) {
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

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
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
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
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
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
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

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
