import { useState, useCallback, useMemo } from 'react'
import { useAgentStore } from '../stores/agentStore'
import type { ButtonState } from '../components/DynamicButton'

export function useChat() {
  const [input, setInput] = useState('')

  const loading = useAgentStore(state => state.loading)
  const isRunning = useAgentStore(state => state.isRunning)
  const sendMessage = useAgentStore(state => state.sendMessage)
  const stopGeneration = useAgentStore(state => state.stopGeneration)
  const addPendingMessage = useAgentStore(state => state.addPendingMessage)

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || loading) return

    const messageContent = input.trim()
    setInput('')

    if (isRunning) {
      addPendingMessage(messageContent)
    } else {
      await sendMessage(messageContent)
    }
  }, [input, loading, isRunning, addPendingMessage, sendMessage])

  const handleStop = useCallback(() => {
    stopGeneration()
  }, [stopGeneration])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const buttonState: ButtonState = useMemo(() => {
    if (loading) return 'loading'
    if (isRunning) {
      return input.trim() ? 'send-active' : 'stop'
    }
    return input.trim() ? 'send-active' : 'send-disabled'
  }, [isRunning, loading, input])

  const handleButtonClick = useCallback(() => {
    if (buttonState === 'stop') {
      handleStop()
    } else if (buttonState === 'send-active') {
      handleSubmit()
    }
  }, [buttonState, handleStop, handleSubmit])

  return {
    input,
    setInput,
    handleSubmit,
    handleStop,
    handleKeyDown,
    handleButtonClick,
    buttonState,
  }
}
