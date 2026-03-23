import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DynamicButton } from '../DynamicButton'

describe('DynamicButton', () => {
  it('should render send button when state is send-active', () => {
    const handleSend = vi.fn()
    render(<DynamicButton state="send-active" onSend={handleSend} onStop={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should render stop button when state is stop', () => {
    const handleStop = vi.fn()
    render(<DynamicButton state="stop" onSend={() => {}} onStop={handleStop} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should be disabled when state is send-disabled', () => {
    render(<DynamicButton state="send-disabled" onSend={() => {}} onStop={() => {}} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
