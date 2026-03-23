import { useRef } from 'react'
import { DynamicButton, type ButtonState } from './DynamicButton'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onButtonClick: () => void
  buttonState: ButtonState
  disabled: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  onButtonClick,
  buttonState,
  disabled,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={onSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
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
