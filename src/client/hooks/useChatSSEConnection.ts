import { useEffect } from 'react'
import { useSSE } from '@shared/hooks/useSSE'
import { apiClient } from '@client/services/apiClient'
import type {
  ChatSSEProtocol,
  PiTextDeltaEvent,
  PiThinkingDeltaEvent,
  PiToolStartEvent,
  PiToolEndEvent,
  PiAgentStartEvent,
  PiAgentEndEvent,
  PiErrorEvent,
} from '@shared/modules/agent'
import { useAgentStore } from '@client/stores/agentStore'
import { useWorkspaceStore } from '@client/stores/workspaceStore'

const FILE_SYSTEM_TOOLS = ['create_file', 'write_file', 'delete_file', 'create_directory'] as const

export function useChatSSEConnection() {
  const agent = useAgentStore(state => state.agent)
  const updateCurrentSubRoundContent = useAgentStore(state => state.updateCurrentSubRoundContent)
  const updateCurrentSubRoundThinking = useAgentStore(state => state.updateCurrentSubRoundThinking)
  const updateMessageError = useAgentStore(state => state.updateMessageError)
  const addAgentMessage = useAgentStore(state => state.addAgentMessage)
  const addToolCallToCurrentSubRound = useAgentStore(state => state.addToolCallToCurrentSubRound)
  const updateToolCallResultInSubRound = useAgentStore(
    state => state.updateToolCallResultInSubRound
  )
  const setMessageStreaming = useAgentStore(state => state.setMessageStreaming)
  const setSseStatus = useAgentStore(state => state.setSseStatus)
  const setIsRunning = useAgentStore(state => state.setIsRunning)
  const addSubRound = useAgentStore(state => state.addSubRound)
  const fetchFiles = useWorkspaceStore(state => state.fetchFiles)

  const { status, connect, disconnect, client } = useSSE<ChatSSEProtocol, typeof agent>(
    async currentAgent => {
      if (!currentAgent?.id) {
        throw new Error('Agent not initialized')
      }

      return apiClient.api.agents[':id'].chat.stream.$sse({
        param: { id: currentAgent.id },
      })
    },
    agent
  )

  useEffect(() => {
    if (!client) return

    const handleTextDelta = (data: PiTextDeltaEvent) => {
      updateCurrentSubRoundContent(data.messageId, prev => prev + data.delta)
      if (data.isFinal) {
        setMessageStreaming(data.messageId, false)
      }
    }

    const handleThinkingDelta = (data: PiThinkingDeltaEvent) => {
      updateCurrentSubRoundThinking(data.messageId, prev => prev + data.delta)
    }

    const handleToolStart = (data: PiToolStartEvent) => {
      addToolCallToCurrentSubRound(data.messageId, {
        id: data.toolCallId,
        name: data.toolName,
        args: data.args,
      })
    }

    const handleToolEnd = (data: PiToolEndEvent) => {
      updateToolCallResultInSubRound(
        data.messageId,
        data.toolCallId,
        data.result,
        data.error || undefined
      )
      addSubRound(data.messageId)

      if (
        data.toolName &&
        FILE_SYSTEM_TOOLS.includes(data.toolName as (typeof FILE_SYSTEM_TOOLS)[number])
      ) {
        fetchFiles()
      }
    }

    const handleAgentStart = (data: PiAgentStartEvent) => {
      addAgentMessage(data.messageId)
      setMessageStreaming(data.messageId, true)
      setIsRunning(true)
    }

    const handleAgentEnd = (data: PiAgentEndEvent) => {
      setMessageStreaming(data.messageId, false)
      setIsRunning(false)
    }

    const handleError = (data: PiErrorEvent) => {
      updateMessageError(data.messageId, {
        code: data.code,
        message: data.message,
        recoverable: data.recoverable,
      })
      setIsRunning(false)
    }

    const unsubscribers = [
      client.on('pi-text-delta', handleTextDelta),
      client.on('pi-thinking-delta', handleThinkingDelta),
      client.on('pi-tool-start', handleToolStart),
      client.on('pi-tool-end', handleToolEnd),
      client.on('pi-agent-start', handleAgentStart),
      client.on('pi-agent-end', handleAgentEnd),
      client.on('pi-error', handleError),
      client.onStatusChange(status => {
        setSseStatus(status)
      }),
    ]

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [
    client,
    updateCurrentSubRoundContent,
    updateCurrentSubRoundThinking,
    updateMessageError,
    addAgentMessage,
    addToolCallToCurrentSubRound,
    updateToolCallResultInSubRound,
    setMessageStreaming,
    setSseStatus,
    setIsRunning,
    addSubRound,
    fetchFiles,
  ])

  return {
    status,
    connect,
    disconnect,
  }
}
