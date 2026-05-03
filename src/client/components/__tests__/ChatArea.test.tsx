import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatArea } from '../ChatArea'

describe('ChatArea', () => {
  it('should render without crashing', () => {
    render(<ChatArea />)
    expect(screen.getByTestId('chat-area')).toBeInTheDocument()
  })

  it('should display empty state when no messages', () => {
    render(<ChatArea />)
    expect(screen.getByText('Start a conversation')).toBeInTheDocument()
  })
})
