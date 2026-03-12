import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '../Footer'

describe('Footer', () => {
  it('should render footer with copyright text', () => {
    render(<Footer />)

    expect(screen.getByText(/Biomimic Todo App/i)).toBeInTheDocument()
    expect(screen.getByText(/©/i)).toBeInTheDocument()
  })

  it('should have correct styling classes', () => {
    const { container } = render(<Footer />)

    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('bg-white')
    expect(footer).toHaveClass('border-t')
  })
})
