import { X } from 'lucide-react'

interface PendingMessagesProps {
  messages: string[]
  onRemove: (index: number) => void
}

export const PendingMessages: React.FC<PendingMessagesProps> = ({ messages, onRemove }) => {
  if (messages.length === 0) return null

  return (
    <div
      className="px-4 py-2 space-y-2 border-t border-gray-200 bg-gray-50"
      data-testid="pending-messages"
    >
      <div className="text-xs text-gray-500 mb-2">Pending messages:</div>
      {messages.map((message, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg group animate-in slide-in-from-bottom-2 duration-200"
          data-testid={`pending-message-${index}`}
        >
          <div className="flex-1 text-sm text-gray-700 truncate">{message}</div>
          <button
            onClick={() => onRemove(index)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            data-testid={`remove-pending-${index}`}
            aria-label="Remove message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
