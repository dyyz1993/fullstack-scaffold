import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../Navigation'

vi.mock('../../stores/todoStore', () => ({
  useTodoStore: () => ({
    todos: [{ id: 1, title: 'Test Todo', status: 'pending' }],
  }),
}))

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navigation', () => {
  it('should render navigation links', () => {
    renderWithRouter(<Navigation />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('should display todo count badge', () => {
    renderWithRouter(<Navigation />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('should have correct styling classes', () => {
    const { container } = renderWithRouter(<Navigation />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('bg-white')
    expect(nav).toHaveClass('shadow')
  })
})
