import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PendingMessages } from '../PendingMessages'

describe('PendingMessages', () => {
  it('should not render when no pending messages', () => {
    const { container } = render(<PendingMessages messages={[]} onRemove={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render pending messages', () => {
    render(<PendingMessages messages={['Message 1', 'Message 2']} onRemove={() => {}} />)
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText('Message 2')).toBeInTheDocument()
  })

  it('should call onRemove when remove button is clicked', () => {
    const handleRemove = vi.fn()
    render(<PendingMessages messages={['Test message']} onRemove={handleRemove} />)

    const removeButton = screen.getByRole('button')
    fireEvent.click(removeButton)
    expect(handleRemove).toHaveBeenCalledWith(0)
  })
})
