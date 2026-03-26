import { useRef, useState, useEffect } from 'react'
import { DynamicButton, type ButtonState } from './DynamicButton'
import { useCommands } from '../hooks/useCommands'
import { CommandPalette } from './CommandPalette'
import type { Command } from './CommandPalette'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onButtonClick: () => void
  buttonState: ButtonState
  disabled: boolean
  onCommand?: (command: Command) => void
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  onButtonClick,
  buttonState,
  disabled,
  onCommand,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const commands: Command[] = [
    {
      id: 'clear',
      name: 'clear',
      description: 'Clear all messages',
    },
    {
      id: 'reset',
      name: 'reset',
      description: 'Reset conversation',
    },
  ]

  const {
    setInput,
    isOpen,
    matches,
    selectedIndex,
    handleKeyDown: handleCommandKeyDown,
    close,
  } = useCommands({
    commands,
    onExecute: (cmd, _input) => onCommand?.(cmd),
    onClearInput: () => setLocalInput(''),
  })

  const [localInput, setLocalInput] = useState(value)

  useEffect(() => {
    setLocalInput(value)
  }, [value])

  const handleChange = (newValue: string) => {
    setLocalInput(newValue)
    onChange(newValue)
    if (newValue.startsWith('/')) {
      setInput(newValue)
    } else {
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (localInput.startsWith('/') && isOpen) {
      handleCommandKeyDown(e)
      if (e.defaultPrevented) return
    }
    onKeyDown(e)
  }

  const handleExecute = (cmd: Command) => {
    onCommand?.(cmd)
    setLocalInput('')
    onChange('')
    close()
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <CommandPalette
        commands={matches.map(m => m.command)}
        isOpen={isOpen}
        input={localInput}
        selectedIndex={selectedIndex}
        onSelect={handleExecute}
        onClose={close}
      />
      <form onSubmit={onSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={localInput}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line, / for commands)"
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>
        <DynamicButton state={buttonState} onSend={onButtonClick} onStop={onButtonClick} />
      </form>
      <div className="mt-2 text-xs text-gray-400 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
