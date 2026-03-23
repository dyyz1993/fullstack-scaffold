import { useState, useEffect, memo, useRef } from 'react'
import { User, Bot, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage, AgentSubRound } from '@shared/modules/agent'

// eslint-disable-next-line local-rules/prefer-shared-types
interface ChatMessageCardProps {
  message: ChatMessage
}

const BASE_TYPING_INTERVAL = 20
const MIN_TYPING_INTERVAL = 2
const BUFFER_CHECK_INTERVAL = 50

function useTypewriter(sourceContent: string, isStreaming: boolean) {
  const [displayedContent, setDisplayedContent] = useState(sourceContent)
  const contentRef = useRef(sourceContent)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastUpdateRef = useRef(Date.now())
  const charIndexRef = useRef(sourceContent.length)

  useEffect(() => {
    contentRef.current = sourceContent
  })

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(sourceContent)
      charIndexRef.current = sourceContent.length
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    if (sourceContent.length <= charIndexRef.current) {
      return
    }

    const remainingChars = sourceContent.length - charIndexRef.current
    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current

    if (timeSinceLastUpdate < BUFFER_CHECK_INTERVAL && remainingChars > 10) {
      const speedMultiplier = Math.min(remainingChars / 10, 10)
      const fastInterval = Math.max(BASE_TYPING_INTERVAL / speedMultiplier, MIN_TYPING_INTERVAL)

      if (!intervalRef.current || intervalRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => {
          const currentLength = contentRef.current.length
          const currentIndex = charIndexRef.current

          if (currentIndex < currentLength) {
            const charsToAdd = Math.ceil(speedMultiplier)
            const nextIndex = Math.min(currentIndex + charsToAdd, currentLength)
            charIndexRef.current = nextIndex
            setDisplayedContent(contentRef.current.slice(0, nextIndex))
            lastUpdateRef.current = Date.now()
          } else {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
        }, fastInterval)
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      intervalRef.current = setInterval(() => {
        const currentLength = contentRef.current.length
        const currentIndex = charIndexRef.current

        if (currentIndex < currentLength) {
          charIndexRef.current = currentIndex + 1
          setDisplayedContent(contentRef.current.slice(0, charIndexRef.current))
          lastUpdateRef.current = Date.now()
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, BASE_TYPING_INTERVAL)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sourceContent, isStreaming])

  return displayedContent
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
  const [thinkingCollapsed, setThinkingCollapsed] = useState(true)
  const hasThinking = subRound.thinking && subRound.thinking.length > 0
  const hasToolCalls = subRound.toolCalls && subRound.toolCalls.length > 0
  const hasContent = subRound.content && subRound.content.length > 0

  const displayedContent = useTypewriter(subRound.content || '', isStreaming || false)

  return (
    <div className="mb-3 last:mb-0">
      {index > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">Round {index + 1}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {hasThinking && (
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1"
          >
            {thinkingCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>Thinking</span>
            {thinkingCollapsed && (
              <span className="ml-1 text-gray-400 truncate max-w-[200px]">
                {subRound.thinking?.slice(0, 50)}...
              </span>
            )}
          </button>
          {!thinkingCollapsed && (
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600 italic whitespace-pre-wrap">
              {subRound.thinking}
              {isStreaming && !hasContent && !hasToolCalls && isLastSubRound && (
                <span className="inline-block ml-1">
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {hasToolCalls && (
        <div className="mb-2 space-y-1">
          {subRound.toolCalls?.map(toolCall => (
            <div key={toolCall.id} className="p-2 bg-gray-50 rounded text-xs font-mono">
              <div className="font-semibold text-gray-700">{toolCall.name}</div>
              <div className="text-gray-500">{JSON.stringify(toolCall.args)}</div>
              {toolCall.result !== undefined && toolCall.result !== null && (
                <div className="mt-1 text-green-600">Result: {JSON.stringify(toolCall.result)}</div>
              )}
              {toolCall.error && <div className="mt-1 text-red-600">Error: {toolCall.error}</div>}
            </div>
          ))}
        </div>
      )}

      {hasContent && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
              th: ({ children }) => (
                <th className="border border-gray-300 px-2 py-1 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-2 py-1">{children}</td>
              ),
              tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
              h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              p: ({ children }) => <p className="my-1">{children}</p>,
              code: ({ className, children }) => {
                const isInline = !className
                return isInline ? (
                  <code className="bg-gray-200 px-1 rounded text-sm">{children}</code>
                ) : (
                  <code className="block bg-gray-800 text-green-400 p-2 rounded text-sm overflow-x-auto">
                    {children}
                  </code>
                )
              },
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-2 italic text-gray-600 my-2">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-4 border-gray-300" />,
            }}
          >
            {displayedContent}
          </ReactMarkdown>
          {isStreaming && isLastSubRound && (
            <span className="inline-block ml-1">
              <Loader2 className="w-4 h-4 animate-spin inline" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export const ChatMessageCard: React.FC<ChatMessageCardProps> = memo(({ message }) => {
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming
  const subRounds = message.subRounds || []
  const hasSubRounds = subRounds.length > 0
  const hasContent = message.content && message.content.length > 0

  const displayedContent = useTypewriter(message.content || '', isStreaming || false)

  const showLoading = isStreaming && !hasSubRounds && !hasContent

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      data-testid={`chat-message-${message.id}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : 'bg-gray-500'
        }`}
      >
        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
          }`}
        >
          {showLoading && (
            <div className="flex items-center gap-2 text-gray-500 py-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}

          {hasSubRounds &&
            subRounds.map((subRound, index) => (
              <SubRoundView
                key={subRound.id}
                subRound={subRound}
                index={index}
                isStreaming={isStreaming ?? undefined}
                isLastSubRound={index === subRounds.length - 1}
              />
            ))}

          {isUser && hasContent && (
            <div className="whitespace-pre-wrap break-words text-white">
              {displayedContent}
              {isStreaming && (
                <span className="inline-block ml-1">
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                </span>
              )}
            </div>
          )}

          {message.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
              <div className="font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  !
                </span>
                Error
              </div>
              <div className="text-sm mt-1 text-red-500">{message.error.message}</div>
            </div>
          )}
        </div>

        <div className="mt-1 text-xs text-gray-400">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
})
