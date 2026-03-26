import { useState, useCallback, useMemo, useRef } from 'react'
import type { Command, CommandMatch } from '../components/CommandPalette'

interface UseCommandsOptions {
  commands: Command[]
  onExecute: (command: Command, input: string) => void
}

export function useCommands({ commands, onExecute }: UseCommandsOptions) {
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = useMemo((): CommandMatch[] => {
    if (!input.startsWith('/')) return []
    const query = input.slice(1).toLowerCase()
    if (!query) {
      return commands.map(cmd => ({ command: cmd, matchIndex: 0 }))
    }
    return commands
      .map(cmd => {
        const nameMatch = cmd.name.toLowerCase().indexOf(query)
        if (nameMatch >= 0) return { command: cmd, matchIndex: nameMatch }
        const descMatch = cmd.description.toLowerCase().indexOf(query)
        if (descMatch >= 0) return { command: cmd, matchIndex: descMatch + 1 }
        return null
      })
      .filter((m): m is CommandMatch => m !== null)
      .sort((a, b) => a.matchIndex - b.matchIndex)
  }, [input, commands])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    setSelectedIndex(0)
    if (!value.startsWith('/')) {
      setIsOpen(false)
    } else if (value.length >= 1) {
      setIsOpen(true)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || matches.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => (i + 1) % matches.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => (i - 1 + matches.length) % matches.length)
          break
        case 'Enter':
          e.preventDefault()
          if (matches[selectedIndex]) {
            onExecute(matches[selectedIndex].command, input)
            setInput('')
            setIsOpen(false)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setInput('')
          break
      }
    },
    [isOpen, matches, selectedIndex, onExecute, input]
  )

  const executeCommand = useCallback(
    (command: Command) => {
      onExecute(command, input)
      setInput('')
      setIsOpen(false)
    },
    [onExecute, input]
  )

  const close = useCallback(() => {
    setIsOpen(false)
    setInput('')
  }, [])

  return {
    input,
    setInput: handleInputChange,
    isOpen,
    matches,
    selectedIndex,
    handleKeyDown,
    executeCommand,
    close,
    inputRef,
  }
}
