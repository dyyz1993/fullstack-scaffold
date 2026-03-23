import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from '../MessageList'
import type { MessageRound } from '@shared/modules/agent'

describe('MessageList', () => {
  const mockRounds: MessageRound[] = []

  it('should render empty state when no rounds', () => {
    render(
      <MessageList
        rounds={mockRounds}
        isRunning={false}
        loadingMore={false}
        hasMoreRounds={false}
        onScroll={() => {}}
      />
    )
    expect(screen.getByText('Start a conversation')).toBeInTheDocument()
  })

  it('should display loading indicator when loadingMore is true', () => {
    const { container } = render(
      <MessageList
        rounds={mockRounds}
        isRunning={false}
        loadingMore={true}
        hasMoreRounds={false}
        onScroll={() => {}}
      />
    )
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
