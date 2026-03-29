import { memo, useState, useCallback, useEffect } from 'react'
import { User, Bot, Loader2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage, AgentSubRound } from '@shared/modules/agent'
import { useTypewriter } from '../hooks/useTypewriter'

interface RoundCardProps {
  userMessage: ChatMessage
  agentMessages: ChatMessage[]
  isStreaming?: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-gray-200 rounded transition-colors"
      title="Copy code"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-gray-500" />
      )}
    </button>
  )
}

function renderToolResult(result: unknown) {
  if (!result) return null

  if (Array.isArray(result)) {
    return result.map((item: unknown, index: number) => {
      if (typeof item === 'object' && item !== null) {
        const contentItem = item as {
          type?: string
          text?: string
          url?: string
          [key: string]: unknown
        }

        if (contentItem.type === 'text' && contentItem.text) {
          return (
            <div key={index} className="text-sm text-gray-700 whitespace-pre-wrap">
              {contentItem.text}
            </div>
          )
        }

        if (contentItem.type === 'image' && contentItem.url) {
          return (
            <div key={index} className="my-2">
              <img
                src={contentItem.url}
                alt=""
                className="max-w-full rounded-lg shadow-sm"
                loading="lazy"
              />
            </div>
          )
        }
      }

      return null
    })
  }

  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>
    if (Array.isArray(obj.content) && obj.content.length > 0) {
      return obj.content.map((item: unknown, index: number) => {
        if (typeof item === 'object' && item !== null) {
          const contentItem = item as {
            type?: string
            text?: string
            url?: string
            [key: string]: unknown
          }

          if (contentItem.type === 'text' && contentItem.text) {
            return (
              <div key={index} className="text-sm text-gray-700 whitespace-pre-wrap">
                {contentItem.text}
              </div>
            )
          }

          if (contentItem.type === 'image' && contentItem.url) {
            return (
              <div key={index} className="my-2">
                <img
                  src={contentItem.url}
                  alt=""
                  className="max-w-full rounded-lg shadow-sm"
                  loading="lazy"
                />
              </div>
            )
          }
        }

        return null
      })
    }
  }

  return (
    <pre className="bg-green-50 p-2 rounded overflow-x-auto font-mono text-xs text-green-700 max-h-40 whitespace-pre-wrap break-all">
      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
    </pre>
  )
}

function SubRoundView({
  subRound,
  index,
  isStreaming,
  isLastSubRound,
}: {
  subRound: AgentSubRound
  index: number
  isStreaming?: boolean
  isLastSubRound: boolean
}) {
  const [thinkingCollapsed, setThinkingCollapsed] = useState(false)
  const [toolsCollapsed, setToolsCollapsed] = useState(true)
  const hasThinking = !!subRound.thinking
  const hasContent = !!subRound.content
  const hasToolCalls = !!subRound.toolCalls && subRound.toolCalls.length > 0

  const isThinking = isStreaming && isLastSubRound && !hasContent && !hasToolCalls

  useEffect(() => {
    if (isStreaming && isLastSubRound) {
      setThinkingCollapsed(false)
    } else if (!isStreaming && isLastSubRound && hasThinking) {
      setThinkingCollapsed(true)
    }
  }, [isStreaming, isLastSubRound, hasThinking])

  const typewriterContent = useTypewriter({
    text: subRound.content || '',
    isStreaming: !!isStreaming && isLastSubRound,
  })
  const displayContent = typewriterContent

  return (
    <div className="mb-4 last:mb-0">
      {index > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">Round {index + 1}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {subRound.thinking && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <button
            type="button"
            onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
            className="flex items-center gap-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 mb-2 w-full text-left"
          >
            {thinkingCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="flex items-center gap-2 flex-1">
              Thinking Process
              {isThinking && (
                <span className="flex items-center gap-1 text-xs text-yellow-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </span>
              )}
            </span>
          </button>

          {!thinkingCollapsed && (
            <div className="text-sm text-yellow-700 whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {subRound.thinking}
            </div>
          )}
        </div>
      )}

      {subRound.toolCalls && subRound.toolCalls.length > 0 && (
        <div className="mb-3 space-y-2">
          <button
            type="button"
            onClick={() => setToolsCollapsed(!toolsCollapsed)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            {toolsCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>Tools ({subRound.toolCalls.length})</span>
            {toolsCollapsed && (
              <span className="text-gray-400 normal-case font-normal ml-1">
                [{subRound.toolCalls.map(tc => tc.name).join(', ')}]
              </span>
            )}
          </button>
          {!toolsCollapsed &&
            subRound.toolCalls.map(toolCall => (
              <ToolCallCard key={toolCall.id} toolCall={toolCall} />
            ))}
        </div>
      )}

      {displayContent && (
        <div className="prose prose-sm max-w-none text-gray-900">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
              th: ({ children }) => (
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => <td className="px-4 py-2 text-sm text-gray-600">{children}</td>,
              tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold mt-3 mb-2 text-gray-900">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold mt-2 mb-1 text-gray-900">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-bold mt-2 mb-1 text-gray-900">{children}</h4>
              ),
              p: ({ children }) => <p className="my-2 text-gray-700 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="text-gray-700">{children}</li>,
              code: ({ className, children, ...props }) => {
                const isInline = !className
                const match = /language-(\w+)/.exec(className || '')
                const language = match ? match[1] : ''
                const codeString = String(children).replace(/\n$/, '')

                if (isInline) {
                  return (
                    <code
                      className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                }

                return (
                  <div className="relative group my-3">
                    <div className="absolute top-0 right-0 m-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={codeString} />
                    </div>
                    {language && (
                      <div className="absolute top-0 left-0 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-br">
                        {language}
                      </div>
                    )}
                    <pre
                      className={`bg-[#1e1e1e] text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono ${language ? 'pt-8' : ''}`}
                    >
                      <code className={`language-${language}`}>{children}</code>
                    </pre>
                  </div>
                )
              },
              pre: ({ children }) => <>{children}</>,
              strong: ({ children }) => (
                <strong className="font-bold text-gray-900">{children}</strong>
              ),
              em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-300 pl-4 py-1 my-2 italic text-gray-600 bg-blue-50 rounded-r">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-4 border-gray-300" />,
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-blue-600 hover:text-blue-800 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {subRound.content}
          </ReactMarkdown>
          {isStreaming && isLastSubRound && (
            <span className="inline-block ml-1">
              <Loader2 className="w-4 h-4 animate-spin inline text-gray-400" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface ToolCallCardProps {
  toolCall: {
    id: string
    name: string
    args: Record<string, unknown>
    result?: unknown
    error?: string | null
  }
}

const toolTypeConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  bash: { icon: '⌨️', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  read: { icon: '📄', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  write: { icon: '✏️', color: 'text-green-700', bgColor: 'bg-green-100' },
  edit: { icon: '🔧', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  glob: { icon: '🔍', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  grep: { icon: '🔎', color: 'text-red-700', bgColor: 'bg-red-100' },
  default: { icon: '⚙️', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const config = toolTypeConfig[toolCall.name] || toolTypeConfig.default

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs max-w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 ${config.bgColor} ${config.color} rounded font-mono font-medium`}
          >
            {config.icon} {toolCall.name}
          </span>
        </div>
      </div>
      <div className="mb-2">
        <div className="text-gray-500 text-xs mb-1">Arguments:</div>
        <pre className="bg-gray-50 p-2 rounded overflow-x-auto font-mono text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(toolCall.args, null, 2)}
        </pre>
      </div>
      {toolCall.result !== undefined && toolCall.result !== null && (
        <div>
          <div className="text-gray-500 text-xs mb-1">Result:</div>
          {renderToolResult(toolCall.result)}
        </div>
      )}
      {toolCall.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600">
          Error: {toolCall.error}
        </div>
      )}
    </div>
  )
}

export const RoundCard: React.FC<RoundCardProps> = memo(
  ({ userMessage, agentMessages, isStreaming }) => {
    const allSubRounds = agentMessages.flatMap(msg => msg.subRounds || [])
    const hasSubRounds = allSubRounds.length > 0
    const hasAnyStreaming = agentMessages.some(msg => msg.isStreaming)
    const hasAnyContent = agentMessages.some(msg => msg.content && msg.content.length > 0)
    const hasAnyThinking = agentMessages.some(msg => msg.subRounds?.some(sr => sr.thinking))
    const isUserStreaming = hasAnyStreaming && !hasAnyContent && !hasAnyThinking
    const lastMessage = agentMessages[agentMessages.length - 1]

    return (
      <div className="space-y-4">
        <div className="flex gap-3 flex-row-reverse">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-500">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="px-4 py-2 rounded-2xl rounded-tr-sm bg-blue-500 text-white max-w-[80%]">
            <div className="whitespace-pre-wrap break-words">{userMessage.content}</div>
          </div>
        </div>

        {agentMessages.length > 0 && (
          <div className="flex gap-3 flex-row">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-500">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 max-w-[80%] flex flex-col">
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
                {isUserStreaming && (
                  <div className="flex items-center gap-2 text-gray-500 py-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}

                {hasSubRounds &&
                  allSubRounds.map((subRound, index) => (
                    <SubRoundView
                      key={subRound.id}
                      subRound={subRound}
                      index={index}
                      isStreaming={lastMessage?.isStreaming ?? undefined}
                      isLastSubRound={index === allSubRounds.length - 1}
                    />
                  ))}

                {lastMessage?.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    <div className="font-medium flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        !
                      </span>
                      Error
                    </div>
                    <div className="text-sm mt-1 text-red-500">{lastMessage.error.message}</div>
                  </div>
                )}
              </div>

              {lastMessage && (
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(lastMessage.createdAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )}

        {isStreaming && agentMessages.length === 0 && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-500">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="px-4 py-2 rounded-2xl rounded-tl-sm bg-gray-100 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Waiting for response...
            </div>
          </div>
        )}
      </div>
    )
  }
)
