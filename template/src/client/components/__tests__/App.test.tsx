/**
 * Unit tests for App component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { App } from '../../App'
import type { Todo } from '@shared/types'

interface MockStore {
  todos: Todo[]
  loading: boolean
  error: string | null
  fetchTodos: ReturnType<typeof vi.fn>
  createTodo: ReturnType<typeof vi.fn>
  updateTodo: ReturnType<typeof vi.fn>
  deleteTodo: ReturnType<typeof vi.fn>
}

const mockStore: MockStore = {
  todos: [],
  loading: false,
  error: null,
  fetchTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}

vi.mock('../../stores/todoStore', () => ({
  useTodoStore: vi.fn((selector?: (state: typeof mockStore) => unknown) => {
    if (selector) {
      return selector(mockStore)
    }
    return mockStore
  }),
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.todos = []
    mockStore.loading = false
    mockStore.error = null
  })

  afterEach(() => {
    cleanup()
  })

  describe('Initial Render', () => {
    it('should render title with correct text', () => {
      render(<App />)
      const titleElement = screen.getByTestId('app-title')
      expect(titleElement).toBeInTheDocument()
      expect(titleElement).toHaveTextContent('Biomimic App')
    })

    it('should render create form with all inputs', () => {
      render(<App />)

      const titleInput = screen.getByTestId('todo-title-input')
      const descriptionInput = screen.getByTestId('todo-description-input')
      const submitButton = screen.getByTestId('add-todo-button')

      expect(titleInput).toBeInTheDocument()
      expect(titleInput).toHaveAttribute('placeholder', 'Todo title...')
      expect(descriptionInput).toBeInTheDocument()
      expect(descriptionInput).toHaveAttribute('placeholder', 'Description (optional)...')
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveTextContent('Add Todo')
    })

    it('should call fetchTodos on mount', () => {
      render(<App />)
      expect(mockStore.fetchTodos).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    it('should display empty state message when no todos', () => {
      render(<App />)
      const emptyState = screen.getByTestId('empty-state')
      expect(emptyState).toBeInTheDocument()
      expect(emptyState).toHaveTextContent('No todos yet. Add one above!')
    })
  })

  describe('Loading State', () => {
    it('should display loading indicator when loading is true', () => {
      mockStore.loading = true
      render(<App />)
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when error exists', () => {
      mockStore.error = 'Test error message'
      render(<App />)
      const errorElement = screen.getByTestId('error-message')
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent('Test error message')
    })
  })

  describe('Todo List', () => {
    it('should render todos when available', () => {
      mockStore.todos = [
        { id: 1, title: 'Todo 1', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        {
          id: 2,
          title: 'Todo 2',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      render(<App />)

      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
      expect(screen.getByText('Todo 1')).toBeInTheDocument()
      expect(screen.getByText('Todo 2')).toBeInTheDocument()
    })
  })
})
