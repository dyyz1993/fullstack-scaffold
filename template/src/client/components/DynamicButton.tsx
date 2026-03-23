import { Send, Square, Loader2 } from 'lucide-react'

export type ButtonState = 'send-disabled' | 'send-active' | 'stop' | 'loading'

interface DynamicButtonProps {
  state: ButtonState
  onSend?: () => void
  onStop?: () => void
  disabled?: boolean
}

export const DynamicButton: React.FC<DynamicButtonProps> = ({
  state,
  onSend,
  onStop,
  disabled,
}) => {
  const getButtonConfig = () => {
    switch (state) {
      case 'stop':
        return {
          icon: <Square className="w-5 h-5" />,
          className:
            'px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors',
          onClick: onStop,
          disabled: false,
          testId: 'stop-button',
        }
      case 'send-active':
        return {
          icon: <Send className="w-5 h-5" />,
          className:
            'px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors',
          onClick: onSend,
          disabled: false,
          testId: 'send-button-active',
        }
      case 'loading':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          className: 'px-6 py-3 bg-blue-500 text-white rounded-xl cursor-wait',
          onClick: undefined,
          disabled: true,
          testId: 'send-button-loading',
        }
      case 'send-disabled':
      default:
        return {
          icon: <Send className="w-5 h-5" />,
          className:
            'px-6 py-3 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed transition-colors',
          onClick: undefined,
          disabled: true,
          testId: 'send-button-disabled',
        }
    }
  }

  const config = getButtonConfig()

  return (
    <button
      type="button"
      onClick={config.onClick}
      disabled={config.disabled || disabled}
      className={`flex items-center gap-2 transition-all duration-200 ${config.className}`}
      data-testid={config.testId}
    >
      {config.icon}
    </button>
  )
}
