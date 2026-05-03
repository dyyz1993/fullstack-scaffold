import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from '../CommandPalette'
import type { Command } from '../CommandPalette'

describe('CommandPalette', () => {
  const mockCommands: Command[] = [
    { id: 'clear', name: 'clear', description: 'Clear all messages', action: vi.fn() },
    { id: 'reset', name: 'reset', description: 'Reset conversation', action: vi.fn() },
  ]

  it('should render commands list', () => {
    render(
      <CommandPalette
        commands={mockCommands}
        isOpen={true}
        input="/"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('/clear')).toBeInTheDocument()
    expect(screen.getByText('/reset')).toBeInTheDocument()
  })

  it('should call onSelect when command is clicked', () => {
    const handleSelect = vi.fn()
    render(
      <CommandPalette
        commands={mockCommands}
        isOpen={true}
        input="/"
        selectedIndex={0}
        onSelect={handleSelect}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('/clear'))
    expect(handleSelect).toHaveBeenCalledWith(mockCommands[0])
  })

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <CommandPalette
        commands={mockCommands}
        isOpen={true}
        input="/"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={handleClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(handleClose).toHaveBeenCalled()
  })
})
