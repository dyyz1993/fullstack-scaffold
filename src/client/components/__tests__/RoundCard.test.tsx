import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoundCard } from '../RoundCard'
import type { ChatMessage } from '@shared/modules/agent'

describe('RoundCard', () => {
  const mockUserMessage: ChatMessage = {
    id: 'msg-1',
    agentId: 'agent-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date().toISOString(),
  }

  const mockAgentMessages: ChatMessage[] = []

  it('should render user message', () => {
    render(<RoundCard userMessage={mockUserMessage} agentMessages={mockAgentMessages} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should not display thinking when no agent messages', () => {
    render(<RoundCard userMessage={mockUserMessage} agentMessages={mockAgentMessages} />)
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
  })
})
