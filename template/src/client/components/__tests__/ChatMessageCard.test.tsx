import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessageCard } from '../ChatMessageCard'
import type { ChatMessage } from '@shared/modules/agent'

describe('ChatMessageCard', () => {
  const mockMessage: ChatMessage = {
    id: 'msg-1',
    agentId: 'agent-1',
    role: 'user',
    content: 'Test message',
    createdAt: new Date().toISOString(),
  }

  it('should render message content', () => {
    render(<ChatMessageCard message={mockMessage} />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should render user avatar for user role', () => {
    render(<ChatMessageCard message={mockMessage} />)
    // lucide-react icons render as <svg> with aria-hidden="true", no role="img"
    const avatar = screen.getByTestId('chat-message-msg-1').querySelector('svg')
    expect(avatar).toBeInTheDocument()
  })
})
