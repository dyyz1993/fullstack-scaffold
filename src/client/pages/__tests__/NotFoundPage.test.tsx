import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import NotFoundPage from '../NotFoundPage'

describe('NotFoundPage', () => {
  it('should render 404 heading', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('should render page not found message', () => {
    render(<NotFoundPage />)
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })

  it('should render go home link', () => {
    render(<NotFoundPage />)
    const link = screen.getByText('Go Home')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})
