import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

export interface Command {
  id: string
  name: string
  description: string
  icon?: ReactNode
  action?: (input: string) => void
}

export interface CommandMatch {
  command: Command
  matchIndex: number
}

export interface CommandPaletteProps {
  commands: Command[]
  isOpen: boolean
  input: string
  selectedIndex: number
  onSelect: (command: Command) => void
  onClose: () => void
}

export function CommandPalette({
  commands,
  isOpen,
  input,
  selectedIndex,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  if (!isOpen || commands.length === 0) return null

  return (
    <div className="mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">{input}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1 hover:bg-gray-200 rounded"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {commands.map((cmd, index) => (
          <button
            key={cmd.id}
            type="button"
            onClick={() => onSelect(cmd)}
            className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
              index === selectedIndex ? 'bg-blue-50' : ''
            }`}
          >
            <div className="font-medium text-gray-900">/{cmd.name}</div>
            <div className="text-xs text-gray-500">{cmd.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
