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

const AUTO_SCROLL_THRESHOLD = 100

const scrollToBottom = (element: HTMLDivElement | null) => {
  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ rounds, isRunning, loadingMore, hasMoreRounds, onScroll, className }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const isAtBottomRef = useRef(true)
    const prevScrollHeightRef = useRef<number>(0)

    useImperativeHandle(ref, () => internalRef.current!)

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      isAtBottomRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD
      onScroll(e)
    }

    useLayoutEffect(() => {
      const container = internalRef.current
      if (!container || rounds.length === 0) return

      if (loadingMore) {
        const newScrollHeight = container.scrollHeight
        const heightDiff = newScrollHeight - prevScrollHeightRef.current
        if (heightDiff > 0) {
          container.scrollTop += heightDiff
        }
      } else if (isAtBottomRef.current) {
        scrollToBottom(container)
      }

      if (!loadingMore) {
        prevScrollHeightRef.current = container.scrollHeight
      }
    }, [rounds, loadingMore])

    useEffect(() => {
      if (!isRunning || !internalRef.current) return

      if (isAtBottomRef.current) {
        scrollToBottom(internalRef.current)
      }
    }, [isRunning])

    return (
      <div
        ref={internalRef}
        className={`flex-1 overflow-y-auto p-6 space-y-4 ${className || ''}`}
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
        {rounds.length === 0 && !isRunning && !loadingMore ? (
          <EmptyState
            icon={MessageSquare}
            title="Start a conversation"
            description="Send a message to begin chatting with the AI assistant"
            className="py-20"
          />
        ) : (
          <>
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
