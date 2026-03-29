import { forwardRef, useEffect, useRef, useImperativeHandle, useLayoutEffect } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import { RoundCard } from './RoundCard'
import { EmptyState } from './EmptyState'
import type { MessageRound } from '@shared/modules/agent'

interface MessageListProps {
  rounds: MessageRound[]
  isRunning: boolean
  loadingMore: boolean
  hasMoreRounds: boolean
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  className?: string
}

const scrollToBottom = (element: HTMLDivElement | null) => {
  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ rounds, isRunning, loadingMore, hasMoreRounds, onScroll, className }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const prevRoundsLengthRef = useRef(0)
    const wasLoadingMoreRef = useRef(false)

    useImperativeHandle(ref, () => internalRef.current!)

    useLayoutEffect(() => {
      const container = internalRef.current
      if (!container || rounds.length === 0) return

      if (rounds.length !== prevRoundsLengthRef.current) {
        if (wasLoadingMoreRef.current) {
          wasLoadingMoreRef.current = false
        } else {
          scrollToBottom(container)
        }
      }
      prevRoundsLengthRef.current = rounds.length
    }, [rounds])

    useEffect(() => {
      if (loadingMore) {
        wasLoadingMoreRef.current = true
      }
    }, [loadingMore])

    useEffect(() => {
      if (!isRunning) return

      const container = internalRef.current
      if (!container) return

      const intervalId = setInterval(() => {
        scrollToBottom(internalRef.current)
      }, 50)

      return () => clearInterval(intervalId)
    }, [isRunning])

    return (
      <div
        ref={internalRef}
        className={`flex-1 overflow-y-auto p-6 space-y-4 ${className || ''}`}
        onScroll={onScroll}
      >
        {rounds.length === 0 && !isRunning ? (
          <EmptyState
            icon={MessageSquare}
            title="Start a conversation"
            description="Send a message to begin chatting with the AI assistant"
            className="py-20"
          />
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {!hasMoreRounds && rounds.length > 0 && !loadingMore && (
              <div className="text-center py-4 text-sm text-gray-400">No more messages</div>
            )}
            {rounds.map((round, index) => (
              <RoundCard
                key={round.userMessage.id || index}
                userMessage={round.userMessage}
                agentMessages={round.agentMessages}
                isStreaming={round.agentMessages.some(msg => msg.isStreaming)}
              />
            ))}
          </>
        )}
      </div>
    )
  }
)

MessageList.displayName = 'MessageList'
