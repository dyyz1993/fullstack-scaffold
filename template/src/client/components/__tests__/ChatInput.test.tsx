import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  it('should render input field', () => {
    render(
      <ChatInput
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        onKeyDown={() => {}}
        onButtonClick={() => {}}
        buttonState="send-disabled"
        disabled={false}
      />
    )
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
  })

  it('should call onChange when typing', () => {
    const handleChange = vi.fn()
    render(
      <ChatInput
        value=""
        onChange={handleChange}
        onSubmit={() => {}}
        onKeyDown={() => {}}
        onButtonClick={() => {}}
        buttonState="send-disabled"
        disabled={false}
      />
    )

    const input = screen.getByPlaceholderText(/type your message/i)
    fireEvent.change(input, { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalledWith('test')
  })

  it('should disable input when disabled prop is true', () => {
    render(
      <ChatInput
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        onKeyDown={() => {}}
        onButtonClick={() => {}}
        buttonState="send-disabled"
        disabled={true}
      />
    )

    const input = screen.getByPlaceholderText(/type your message/i)
    expect(input).toBeDisabled()
  })
})
