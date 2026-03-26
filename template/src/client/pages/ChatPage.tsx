import { useEffect, useState } from 'react'
import { MessageSquare, Settings, Trash2 } from 'lucide-react'
import { ChatArea } from '../components/ChatArea'
import { WorkspacePanel } from '../components/WorkspacePanel'
import { useAgentStore } from '../stores/agentStore'
import { useChatSSEConnection } from '../hooks/useChatSSEConnection'

export const ChatPage: React.FC = () => {
  const agent = useAgentStore(state => state.agent)
  const fetchAgent = useAgentStore(state => state.fetchAgent)
  const fetchRounds = useAgentStore(state => state.fetchRounds)
  const clearMessages = useAgentStore(state => state.clearMessages)
  const [isInitialized, setIsInitialized] = useState(false)
  const {
    status: sseStatus,
    connect: connectSSE,
    disconnect: disconnectSSE,
  } = useChatSSEConnection()

  useEffect(() => {
    const init = async () => {
      if (!agent) {
        await fetchAgent()
      }
      setIsInitialized(true)
    }
    init()
  }, [agent, fetchAgent])

  useEffect(() => {
    if (agent && isInitialized) {
      fetchRounds(5)
    }
  }, [agent, isInitialized, fetchRounds])

  useEffect(() => {
    if (agent && isInitialized) {
      connectSSE()
    }
    return () => {
      disconnectSSE()
    }
  }, [agent, isInitialized, connectSSE, disconnectSSE])

  const handleClearChat = async () => {
    await clearMessages()
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex" data-testid="chat-page">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Chat
          </h2>
        </div>

        <div className="flex-1 p-4">
          {agent && (
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="font-medium text-gray-900">{agent.name}</div>
                <div className="text-sm text-gray-500 mt-1">{agent.description}</div>
                {agent.model && (
                  <div className="text-xs text-gray-400 mt-1">Model: {agent.model}</div>
                )}
              </div>
              <div className="text-xs text-gray-400">
                SSE Status:{' '}
                <span
                  className={`font-medium ${
                    sseStatus === 'open'
                      ? 'text-green-500'
                      : sseStatus === 'connecting'
                        ? 'text-yellow-500'
                        : 'text-red-500'
                  }`}
                >
                  {sseStatus}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleClearChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="clear-chat-button"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="settings-button"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        <ChatArea />
      </div>

      <div className="w-80 bg-white border-l border-gray-200">
        <WorkspacePanel />
      </div>
    </div>
  )
}
