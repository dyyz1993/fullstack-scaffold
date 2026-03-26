import { useEffect } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { useScrollLoading } from '../hooks/useScrollLoading'
import { useChat } from '../hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { PendingMessages } from './PendingMessages'
import { FilePreview } from './FilePreview'
import { useWorkspaceStore } from '../stores/workspaceStore'

export const ChatArea: React.FC = () => {
  const rounds = useAgentStore(state => state.rounds)
  const loading = useAgentStore(state => state.loading)
  const loadingMore = useAgentStore(state => state.loadingMore)
  const hasMoreRounds = useAgentStore(state => state.hasMoreRounds)
  const isRunning = useAgentStore(state => state.isRunning)
  const pendingMessages = useAgentStore(state => state.pendingMessages)
  const removePendingMessage = useAgentStore(state => state.removePendingMessage)
  const sendPendingMessages = useAgentStore(state => state.sendPendingMessages)
  const selectedFile = useWorkspaceStore(state => state.selectedFile)
  const setSelectedFile = useWorkspaceStore(state => state.setSelectedFile)

  const { containerRef, handleScroll } = useScrollLoading({
    hasMore: hasMoreRounds,
    loadingMore,
    onLoadMore: useAgentStore(state => state.loadMoreRounds),
    rounds,
  })

  const { input, setInput, handleSubmit, handleKeyDown, handleButtonClick, buttonState } = useChat()

  useEffect(() => {
    if (!isRunning && pendingMessages.length > 0) {
      sendPendingMessages()
    }
  }, [isRunning, pendingMessages.length, sendPendingMessages])

  const handleClosePreview = () => {
    setSelectedFile(null)
  }

  return (
    <div className="flex flex-col h-full" data-testid="chat-area">
      <div className={`flex-1 overflow-y-auto ${selectedFile ? 'hidden' : ''}`}>
        <MessageList
          ref={containerRef}
          rounds={rounds}
          isRunning={isRunning}
          loadingMore={loadingMore}
          hasMoreRounds={hasMoreRounds}
          onScroll={handleScroll}
        />
      </div>

      <div className={`flex-1 overflow-y-auto ${selectedFile ? '' : 'hidden'}`}>
        {selectedFile && <FilePreview file={selectedFile} onClose={handleClosePreview} />}
      </div>

      <PendingMessages messages={pendingMessages} onRemove={removePendingMessage} />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onButtonClick={handleButtonClick}
        buttonState={buttonState}
        disabled={loading}
      />
    </div>
  )
}
