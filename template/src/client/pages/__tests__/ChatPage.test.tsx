import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChatPage } from '../ChatPage'

vi.mock('../../../stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    agent: null,
    rounds: [],
    loading: false,
    fetchAgent: vi.fn(),
    fetchRounds: vi.fn(),
  })),
}))

describe('ChatPage', () => {
  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    )
    expect(screen.getByTestId('chat-page')).toBeInTheDocument()
  })

  it('should show loading when fetching agent', () => {
    vi.mock('../../../stores/agentStore', () => ({
      useAgentStore: vi.fn(() => ({
        agent: null,
        rounds: [],
        loading: true,
        fetchAgent: vi.fn(),
        fetchRounds: vi.fn(),
      })),
    }))

    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    )
  })
})
